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
          if (orgs?.length > 0) {
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
          if (ent?.length > 0) {
            setSelectedEntity(ent[0].id);
          }
        } catch (error) {
          console.error('Failed to fetch entities:', error);
        }
      }
    };
    fetchEntities();
  }, [selectedOrg, user]);

  return {
    organisations,
    selectedOrg,
    setSelectedOrg,
    entities,
    selectedEntity,
    setSelectedEntity,
    loading,
    organisationId: selectedOrg,
  };
};
