import {
  Body,
  Button,
  Container,
  Heading,
  Hr,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { UrdekoEmailDocument, UrdekoEmailHead } from "../shell";

type Props = {
  firstName: string;
  projectName: string;
  renderUrl: string;
  dashboardUrl: string;
  advice?: string;
};

export function RenderReady({
  firstName,
  projectName,
  renderUrl,
  dashboardUrl,
  advice,
}: Props) {
  return (
    <UrdekoEmailDocument lang="fr">
      <UrdekoEmailHead />
      <Preview>Votre rendu UrdeKo "{projectName}" est prêt</Preview>
      <Body
        style={{
          backgroundColor: "#f8f6f2",
          color: "#2e2f2d",
          fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 32 }}>
          <Heading style={{ fontSize: 28, marginBottom: 8 }}>
            Votre rendu est prêt, {firstName}
          </Heading>
          <Text style={{ fontSize: 16, lineHeight: 1.6 }}>
            Votre projet <b>{projectName}</b> vient d'être finalisé par nos modèles IA.
          </Text>
          <Section style={{ margin: "24px 0" }}>
            <Img src={renderUrl} alt="Votre rendu" style={{ width: "100%", borderRadius: 12 }} />
          </Section>
          {advice ? (
            <Section
              style={{
                backgroundColor: "#f2f1ec",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 12, color: "#a63300", letterSpacing: 2, marginBottom: 4 }}>
                LE CONSEIL URDEKO
              </Text>
              <Text style={{ fontStyle: "italic", fontSize: 15 }}>{advice}</Text>
            </Section>
          ) : null}
          <Button
            href={dashboardUrl}
            style={{
              backgroundImage: "linear-gradient(to bottom right, #ff7949, #a63300)",
              color: "#451000",
              padding: "16px 28px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 16,
              display: "inline-block",
            }}
          >
            Voir mon projet →
          </Button>
          <Hr style={{ borderColor: "#e4e2de", margin: "32px 0" }} />
          <Text style={{ fontSize: 12, color: "#777774" }}>
            Besoin d'ajuster quelque chose ? Répondez simplement à cet email, un conseiller UrdeKo
            vous répondra sous 24h.
          </Text>
        </Container>
      </Body>
    </UrdekoEmailDocument>
  );
}

export default RenderReady;
