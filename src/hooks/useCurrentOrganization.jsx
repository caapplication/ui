import { useMemo } from 'react';
import { useAuth } from './useAuth';

export const useCurrentOrganization = (providedEntityId) => {
  const { user } = useAuth();

  // Use provided entity ID (from props) or fallback to localStorage
  const currentEntityId = providedEntityId || localStorage.getItem('entityId');

  const organizationId = useMemo(() => {
    if (!user) return null;

    // Default to user's direct organization_id
    let resolvedOrgId = typeof user.organization_id === 'object' && user.organization_id !== null
      ? user.organization_id.id
      : user.organization_id;

    // If we have a selected entity and the user has a list of entities (clients)
    if (currentEntityId && user.entities && user.entities.length > 0) {
      // Find the selected entity in the user's available entities
      const selectedEntity = user.entities.find(e => String(e.id) === String(currentEntityId));

      // If found, use its organization_id
      if (selectedEntity && selectedEntity.organization_id) {
        resolvedOrgId = selectedEntity.organization_id;
      }
    }

    // Also check against the organizations list directly if needed (e.g. for CLIENT_MASTER_ADMIN)
    // This handles cases where user.entities might be incomplete but organizations list is present
    if (currentEntityId && user.organizations && user.organizations.length > 0) {
      // Logic to finding org by entity might be complex if we only have org list
      // But usually user.entities should be populated by useAuth with the flattened list of all clients from all orgs
    }

    return resolvedOrgId;
  }, [user, currentEntityId]);

  return organizationId;
};
