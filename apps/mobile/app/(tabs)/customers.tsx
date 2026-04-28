import { Text, View } from "react-native";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { useCustomers } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

export default function CustomersScreen() {
  const customers = useCustomers();
  if (customers.isLoading) return <StateView state="loading" />;
  if (customers.isError) return <StateView state="error" onRetry={() => customers.refetch()} />;
  if (!customers.data?.length) return <StateView state="empty" />;
  return (
    <Screen>
      {customers.data.map((customer) => (
        <View key={customer.id} className="gap-2 rounded-2xl bg-white p-4">
          <Text className="text-lg font-bold text-ink" selectable>
            {customer.fullName}
          </Text>
          <Text className="text-sm text-muted" selectable>
            {customer.phoneE164} · {customer.city}
          </Text>
          <Text className="text-sm text-muted" selectable>
            {t("customers.totalOrders")}: {customer.totalOrders} · {t("customers.spent")}:{" "}
            {formatMAD(customer.totalSpentMAD)}
          </Text>
        </View>
      ))}
    </Screen>
  );
}
