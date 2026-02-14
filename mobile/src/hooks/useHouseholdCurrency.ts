/**
 * Hook to get the current household's currency.
 * Returns the currency code from the household entity,
 * falling back to 'CHF' while loading or if not found.
 */
import { db } from '@/lib/db';
import { getCurrencyConfig, type CurrencyCode } from '@/constants/currencies';

export function useHouseholdCurrency(): {
  currency: CurrencyCode;
  symbol: string;
  isLoading: boolean;
} {
  const { user } = db.useAuth();

  const { data: userData } = db.useQuery(
    user?.email
      ? {
          users: {
            $: { where: { email: user.email.toLowerCase() } },
          },
        }
      : null
  );

  const userId = userData?.users?.[0]?.id;

  const { data: memberData } = db.useQuery(
    userId
      ? {
          householdMembers: {
            $: { where: { userId, status: 'active' } },
          },
        }
      : null
  );

  const householdId = memberData?.householdMembers?.[0]?.householdId;

  const { data: householdData, isLoading } = db.useQuery(
    householdId
      ? {
          households: {
            $: { where: { id: householdId } },
          },
        }
      : null
  );

  const currencyCode = (householdData?.households?.[0]?.currency || 'CHF') as CurrencyCode;
  const config = getCurrencyConfig(currencyCode);

  return {
    currency: currencyCode,
    symbol: config.symbol,
    isLoading: !householdData && isLoading,
  };
}
