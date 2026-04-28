import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { TextField } from "@/components/text-field";
import { useCustomers } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

export default function CustomersScreen() {
  const [query, setQuery] = useState("");
  const customers = useCustomers();
  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (
      customers.data?.filter(
        (customer) =>
          !normalizedQuery ||
          customer.fullName.toLowerCase().includes(normalizedQuery) ||
          customer.phoneE164.includes(normalizedQuery),
      ) ?? []
    );
  }, [customers.data, query]);

  if (customers.isLoading) return <StateView state="loading" />;
  if (customers.isError) return <StateView state="error" onRetry={() => customers.refetch()} />;
  return (
    <Screen>
      <TextField label={t("common.search")} value={query} onChangeText={setQuery} />
      {!filteredCustomers.length ? <StateView state="empty" /> : null}
      {filteredCustomers.map((customer) => (
        <Link key={customer.id} href={`/customers/${customer.id}`} asChild>
          <Pressable className="gap-2 rounded-2xl bg-white p-4">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-lg font-bold text-ink" selectable>
                {customer.fullName}
              </Text>
              <Text
                className="rounded-full bg-surface-warm px-3 py-1 text-xs font-semibold text-muted"
                selectable
              >
                {customer.totalOrders}
              </Text>
            </View>
            <Text className="text-sm text-muted" selectable>
              {customer.phoneE164} · {customer.city}
            </Text>
            <Text className="text-sm text-muted" selectable>
              {t("customers.spent")}: {formatMAD(customer.totalSpentMAD)}
            </Text>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}
