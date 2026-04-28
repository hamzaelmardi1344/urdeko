import { WebView } from "react-native-webview";
import { Screen } from "@/components/screen";
import { useShop } from "@/hooks/use-api-data";

export default function StorePreviewScreen() {
  const shop = useShop();
  const slug = shop.data?.slug ?? "";
  return (
    <Screen padded={false}>
      <WebView source={{ uri: `${process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000"}/${slug}` }} style={{ minHeight: 720 }} />
    </Screen>
  );
}
