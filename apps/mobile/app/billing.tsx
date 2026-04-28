import { WebView } from "react-native-webview";
import { Screen } from "@/components/screen";
import { useShop } from "@/hooks/use-api-data";

export default function BillingScreen() {
  const shop = useShop();
  const url = `${process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000"}/billing?plan=${
    shop.data?.plan ?? "FREE"
  }`;
  return (
    <Screen padded={false}>
      <WebView source={{ uri: url }} style={{ minHeight: 720 }} />
    </Screen>
  );
}
