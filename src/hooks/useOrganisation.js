import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { listOrganisations, listEntities } from '@/lib/api';

export const useOrganisation = () => {
  const { user } = useAuth();
  const [organisations, setOrganisations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganisations = async () => {
      if (user?.access_token && user.role !== 'CLIENT_USER') {
        try {
          const orgs = await listOrganisations(user.access_token);
          setOrganisations(orgs || []);
          const storedOrgId = localStorage.getItem('organisationId');
          if (storedOrgId && orgs?.some(o => o.id === storedOrgId)) {
            setSelectedOrg(storedOrgId);
          } else if (orgs?.length > 0) {
            setSelectedOrg(orgs[0].id);
          }
        } catch (error) {
          console.error('Failed to fetch organisations:', error);
        }
      } else if (user?.entities?.length > 0) {
        setSelectedOrg(user.entities[0].organisation_id);
      }
      setLoading(false);
    };
    fetchOrganisations();
  }, [user]);

  useEffect(() => {
    const fetchEntities = async () => {
      if (selectedOrg && user?.access_token) {
        try {
          const ent = await listEntities(selectedOrg, user.access_token);
          setEntities(ent || []);
        } catch (error) {
          console.error('Failed to fetch entities:', error);
        }
      }
    };
    fetchEntities();
  }, [selectedOrg, user]);

  useEffect(() => {
    const storedEntityId = localStorage.getItem('entityId');
    if (entities.length > 0) {
      if (storedEntityId && entities.some(e => e.id === storedEntityId)) {
        setSelectedEntity(storedEntityId);
      } else {
        setSelectedEntity(entities[0].id);
      }
    }
  }, [entities]);

  // Wrap setSelectedEntity to also update localStorage
  const setSelectedEntityAndLocalStorage = (entityId) => {
    setSelectedEntity(entityId);
    if (entityId) {
      localStorage.setItem('entityId', entityId);
    } else {
      localStorage.removeItem('entityId');
    }
  };

  const setSelectedOrgAndLocalStorage = (orgId) => {
    setSelectedOrg(orgId);
    if (orgId) {
      localStorage.setItem('organisationId', orgId);
    } else {
      localStorage.removeItem('organisationId');
    }
    // When org changes, entity should be cleared to avoid inconsistent state
    setSelectedEntityAndLocalStorage(null);
  };

  return {
    organisations,
    selectedOrg,
    setSelectedOrg: setSelectedOrgAndLocalStorage,
    entities,
    selectedEntity,
    setSelectedEntity: setSelectedEntityAndLocalStorage,
    loading,
    organisationId: selectedOrg,
  };
};
