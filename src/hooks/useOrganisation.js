import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { listOrganisations, listEntities } from '@/lib/api';
import { useApiCache } from '@/contexts/ApiCacheContext.jsx';

export const useOrganisation = () => {
  const { user } = useAuth();
  const cache = useApiCache();
  const [organisations, setOrganisations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  const orgRef = useRef(null);

  useEffect(() => {
    // Only fetch if user actually changed
    if (userRef.current?.access_token === user?.access_token && userRef.current?.role === user?.role) {
      return;
    }
    userRef.current = user;

    const fetchOrganisations = async () => {
      if (user?.access_token && user.role !== 'CLIENT_USER') {
        try {
          // Check cache first
          let orgs = cache.get('listOrganisations', { token: user.access_token });

          if (!orgs) {
            orgs = await listOrganisations(user.access_token);
            cache.set('listOrganisations', { token: user.access_token }, orgs);
          }

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
  }, [user?.access_token, user?.role, cache]);

  useEffect(() => {
    // Only fetch if selectedOrg actually changed
    if (orgRef.current === selectedOrg) {
      return;
    }
    orgRef.current = selectedOrg;

    const fetchEntities = async () => {
      if (selectedOrg && user?.access_token) {
        try {
          // Check cache first
          let ent = cache.get('listEntities', { orgId: selectedOrg, token: user.access_token });

          if (!ent) {
            ent = await listEntities(selectedOrg, user.access_token);
            cache.set('listEntities', { orgId: selectedOrg, token: user.access_token }, ent);
          }

          setEntities(ent || []);
        } catch (error) {
          console.error('Failed to fetch entities:', error);
        }
      } else {
        setEntities([]);
      }
    };
    fetchEntities();
  }, [selectedOrg, user?.access_token, cache]);

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
  const setSelectedEntityAndLocalStorage = useCallback((entityId) => {
    setSelectedEntity(entityId);
    if (entityId) {
      localStorage.setItem('entityId', entityId);
    } else {
      localStorage.removeItem('entityId');
    }
  }, []);

  const setSelectedOrgAndLocalStorage = useCallback((orgId) => {
    setSelectedOrg(orgId);
    if (orgId) {
      localStorage.setItem('organisationId', orgId);
    } else {
      localStorage.removeItem('organisationId');
    }
    // When org changes, entity should be cleared to avoid inconsistent state
    setSelectedEntityAndLocalStorage(null);
  }, [setSelectedEntityAndLocalStorage]);

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
