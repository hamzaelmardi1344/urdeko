import { Text, TextInput, View } from "react-native";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  multiline?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline,
}: TextFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink" selectable>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        className="min-h-[52px] rounded-2xl border border-black/10 bg-white px-4 text-base text-ink"
        placeholderTextColor="#5C6470"
      />
    </View>
  );
}
