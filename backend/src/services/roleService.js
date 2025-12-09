class RoleService {
    static roles = {
        ADMIN: 'admin',
        MANAGER: 'manager',
        VIEWER: 'viewer',
        FREE_USER: 'free_user'
    };

    static permissions = {
        // Cost Management
        VIEW_COSTS: 'view_costs',
        EXPORT_COSTS: 'export_costs',
        CREATE_ALERTS: 'create_alerts',
        MANAGE_ALERTS: 'manage_alerts',

        // User Management
        MANAGE_USERS: 'manage_users',
        VIEW_AUDIT_LOGS: 'view_audit_logs',

        // Advanced Features
        BULK_OPERATIONS: 'bulk_operations',
        API_ACCESS: 'api_access',
        UNLIMITED_EXPORTS: 'unlimited_exports'
    };

    static rolePermissions = {
        [this.roles.ADMIN]: [
            this.permissions.VIEW_COSTS,
            this.permissions.EXPORT_COSTS,
            this.permissions.CREATE_ALERTS,
            this.permissions.MANAGE_ALERTS,
            this.permissions.MANAGE_USERS,
            this.permissions.VIEW_AUDIT_LOGS,
            this.permissions.BULK_OPERATIONS,
            this.permissions.API_ACCESS,
            this.permissions.UNLIMITED_EXPORTS
        ],
        [this.roles.MANAGER]: [
            this.permissions.VIEW_COSTS,
            this.permissions.EXPORT_COSTS,
            this.permissions.CREATE_ALERTS,
            this.permissions.MANAGE_ALERTS,
            this.permissions.BULK_OPERATIONS,
            this.permissions.API_ACCESS
        ],
        [this.roles.VIEWER]: [
            this.permissions.VIEW_COSTS,
            this.permissions.EXPORT_COSTS,
            this.permissions.CREATE_ALERTS
        ],
        [this.roles.FREE_USER]: [
            this.permissions.VIEW_COSTS,
            this.permissions.API_ACCESS,
            this.permissions.CREATE_ALERTS,
            this.permissions.EXPORT_COSTS,
            this.permissions.MANAGE_ALERTS,  // Add all features for free users
            this.permissions.BULK_OPERATIONS
        ]
    };

    static hasPermission(userRole, permission) {
        const rolePerms = this.rolePermissions[userRole] || [];
        const normalizedPermission = permission.toLowerCase();
        const hasAccess = rolePerms.includes(normalizedPermission);

        console.log('🔍 Permission Check Detail:', {
            userRole,
            requestedPermission: permission,
            normalizedPermission,
            availablePermissions: rolePerms,
            hasAccess
        });

        return hasAccess;
    }

    static getUserRole(subscriptionTier) {
        const tierRoleMap = {
            'enterprise': this.roles.ADMIN,
            'professional': this.roles.MANAGER,
            'standard': this.roles.VIEWER,
            'free': this.roles.FREE_USER
        };
        return tierRoleMap[subscriptionTier] || this.roles.FREE_USER;
    }

    static getRoleInfo(role) {
        return {
            role,
            permissions: this.rolePermissions[role] || [],
            description: this.getRoleDescription(role)
        };
    }

    static getRoleDescription(role) {
        const descriptions = {
            [this.roles.ADMIN]: 'Full system access with user management',
            [this.roles.MANAGER]: 'Advanced cost management and team features',
            [this.roles.VIEWER]: 'Cost viewing and basic alert creation',
            [this.roles.FREE_USER]: 'Basic cost viewing only'
        };
        return descriptions[role] || 'Unknown role';
    }
}

module.exports = RoleService;