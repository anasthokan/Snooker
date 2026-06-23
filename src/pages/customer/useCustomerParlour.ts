import { useEffect, useState } from 'react';
import { getCustomerPortalConfig } from '../../api/customerPortal';

interface UseCustomerParlourResult {
  tenantId: number | null;
  tenantName: string;
  loading: boolean;
  configError: string;
}

export function useCustomerParlour(tenantParam: string | null): UseCustomerParlourResult {
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tenantName, setTenantName] = useState('GameHub Pro');
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setConfigError('');

    const fromUrl = tenantParam ? Number(tenantParam) : NaN;
    const configPromise =
      tenantParam && !Number.isNaN(fromUrl) && fromUrl >= 1
        ? getCustomerPortalConfig(fromUrl)
        : getCustomerPortalConfig();

    configPromise
      .then((res) => {
        if (cancelled) return;
        setTenantId(res.data?.tenant_id ?? null);
        setTenantName(res.data?.tenant_name ?? 'GameHub Pro');
      })
      .catch(() => {
        if (!cancelled) {
          setTenantId(null);
          setConfigError('Could not load parlour details.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantParam]);

  return { tenantId, tenantName, loading, configError };
}
