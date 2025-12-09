#!/usr/bin/env node
/**
 * Diagnostic: Verify if AWS Cost Explorer returns EKS (Amazon Elastic Kubernetes Service) costs
 * Usage: node backend/scripts/test-eks-cost.js [days]
 * - Uses default AWS credential resolution (env vars, shared config/role, etc.)
 * - Prints:
 *    1) Whether EKS shows up as a SERVICE in Cost Explorer for the time window
 *    2) Daily EKS control-plane costs grouped by USAGE_TYPE and REGION
 *
 * Notes:
 * - Cost Explorer only attributes the EKS control plane costs to the "Amazon Elastic Kubernetes Service" service.
 *   Most Kubernetes workload costs are billed under EC2/Fargate/EBS/ELB/DataTransfer. To attribute those to EKS
 *   clusters/namespaces/workloads you must enable "Cost allocation for Kubernetes" (Billing console) and/or ingest CUR.
 */

const { CostExplorerClient, GetCostAndUsageCommand } = require("@aws-sdk/client-cost-explorer");

(async () => {
    try {
        const days = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 30;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const Start = startDate.toISOString().split("T")[0];
        const End = endDate.toISOString().split("T")[0];

        const ce = new CostExplorerClient({
            region: process.env.AWS_REGION || "us-east-1",
        });

        // 1) Top services in window — to see if EKS shows up at all
        const topServicesParams = {
            TimePeriod: { Start, End },
            Granularity: "DAILY",
            Metrics: ["UnblendedCost"],
            GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
        };

        const topServicesResp = await ce.send(new GetCostAndUsageCommand(topServicesParams));

        // Aggregate per SERVICE across days
        const serviceTotals = new Map();
        (topServicesResp.ResultsByTime || []).forEach((day) => {
            (day.Groups || []).forEach((g) => {
                const service = g.Keys?.[0] || "UNKNOWN";
                const amount = Number(g.Metrics?.UnblendedCost?.Amount || 0);
                serviceTotals.set(service, (serviceTotals.get(service) || 0) + amount);
            });
        });

        const sortedServices = [...serviceTotals.entries()].sort((a, b) => b[1] - a[1]);
        const eksTotal = serviceTotals.get("Amazon Elastic Kubernetes Service") || 0;

        console.log("=== Cost Explorer: Top services by UnblendedCost ===");
        sortedServices.slice(0, 20).forEach(([svc, amt]) => {
            console.log(`${svc.padEnd(60)} $${amt.toFixed(4)}`);
        });
        console.log(`\nEKS service detected total (control plane): $${eksTotal.toFixed(4)} over ${days} days\n`);

        // 2) EKS-only breakdown: group by USAGE_TYPE and REGION
        const eksParams = {
            TimePeriod: { Start, End },
            Granularity: "DAILY",
            Metrics: ["UnblendedCost", "UsageQuantity"],
            Filter: {
                Dimensions: {
                    Key: "SERVICE",
                    Values: ["Amazon Elastic Kubernetes Service"],
                },
            },
            GroupBy: [
                { Type: "DIMENSION", Key: "USAGE_TYPE" },
                { Type: "DIMENSION", Key: "REGION" },
            ],
        };

        const eksResp = await ce.send(new GetCostAndUsageCommand(eksParams));

        // Aggregate per USAGE_TYPE + REGION
        const usageTotals = new Map(); // key: `${usageType} | ${region}`
        (eksResp.ResultsByTime || []).forEach((day) => {
            (day.Groups || []).forEach((g) => {
                const usageType = g.Keys?.[0] || "UNKNOWN_USAGE";
                const region = g.Keys?.[1] || "UNKNOWN_REGION";
                const key = `${usageType} | ${region}`;
                const amount = Number(g.Metrics?.UnblendedCost?.Amount || 0);
                const qty = Number(g.Metrics?.UsageQuantity?.Amount || 0);
                const cur = usageTotals.get(key) || { cost: 0, qty: 0 };
                cur.cost += amount;
                cur.qty += qty;
                usageTotals.set(key, cur);
            });
        });

        console.log("=== EKS (SERVICE filter) breakdown by USAGE_TYPE and REGION ===");
        if (usageTotals.size === 0) {
            console.log("No EKS control-plane costs detected in this window. This can be normal if:");
            console.log("- The cluster is very new (Cost Explorer data can lag 24-48h)");
            console.log("- You're running self-managed nodes (node/volume/ELB costs appear under EC2/EBS/ELB/DataTransfer)");
            console.log("- You're using Fargate (compute costs appear under AWS Fargate service)");
            console.log("- You need to enable 'Cost allocation for Kubernetes' and/or ingest Cost & Usage Report (CUR) for pod/namespace mapping");
        } else {
            const rows = [...usageTotals.entries()].sort((a, b) => b[1].cost - a[1].cost);
            rows.forEach(([key, v]) => {
                console.log(`${key.padEnd(50)} cost=$${v.cost.toFixed(4)} usage=${v.qty.toFixed(2)}`);
            });
        }

        // Exit with 0 if any EKS costs were detected (service or breakdown), 2 otherwise
        process.exit(eksTotal > 0 || usageTotals.size > 0 ? 0 : 2);
    } catch (err) {
        console.error("Error while querying Cost Explorer for EKS:", err?.message || err);
        process.exit(1);
    }
})();
