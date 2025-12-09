const RoleService = require('../services/roleService');

const requirePermission = (permission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const userRole = RoleService.getUserRole(req.user.subscription_tier || 'free');
            const hasPermission = RoleService.hasPermission(userRole, permission);

            console.log('🔍 RBAC Check:', {
                email: req.user.email,
                subscription_tier: req.user.subscription_tier,
                userRole,
                requiredPermission: permission,
                hasPermission,
                availablePermissions: RoleService.getRoleInfo(userRole).permissions
            });

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    required: permission.toLowerCase(),
                    userRole: userRole,
                    availablePermissions: RoleService.getRoleInfo(userRole).permissions
                });
            }

            req.userRole = userRole;
            req.userPermissions = RoleService.getRoleInfo(userRole).permissions;
            next();

        } catch (error) {
            console.error('RBAC middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'Permission check failed'
            });
        }
    };
};

const requireRole = (role) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const userRole = RoleService.getUserRole(req.user.subscription_tier || 'free');

            if (userRole !== role) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient role level',
                    required: role,
                    current: userRole
                });
            }

            req.userRole = userRole;
            next();

        } catch (error) {
            console.error('Role middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'Role check failed'
            });
        }
    };
};

const attachUserRole = (req, res, next) => {
    try {
        if (req.user) {
            const userRole = RoleService.getUserRole(req.user.subscription_tier || 'free');
            req.userRole = userRole;
            req.userPermissions = RoleService.getRoleInfo(userRole).permissions;
        }
        next();
    } catch (error) {
        console.error('Role attachment error:', error);
        next();
    }
};

module.exports = {
    requirePermission,
    requireRole,
    attachUserRole,
    RoleService
};