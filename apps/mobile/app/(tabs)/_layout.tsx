import { Tabs } from "expo-router";
import { Home, Package, Settings, ShoppingBag, Users } from "lucide-react-native";
import { t } from "@/i18n/i18n";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#E8417F",
        tabBarInactiveTintColor: "#5C6470",
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t("tabs.home"), tabBarIcon: ({ color }) => <Home color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: t("tabs.orders"), tabBarIcon: ({ color }) => <Package color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: t("tabs.catalog"),
          tabBarIcon: ({ color }) => <ShoppingBag color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{ title: t("tabs.customers"), tabBarIcon: ({ color }) => <Users color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="shop"
        options={{ title: t("tabs.shop"), tabBarIcon: ({ color }) => <Settings color={color} size={22} /> }}
      />
    </Tabs>
  );
}
