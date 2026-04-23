import {
  Body,
  Container,
  Head as EmailHead,
  Heading,
  Html as EmailRoot,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function ProjectConfirmation({
  firstName,
  projectName,
}: {
  firstName: string;
  projectName: string;
}) {
  return (
    <EmailRoot lang="fr">
      <EmailHead />
      <Preview>Votre projet UrdeKo "{projectName}" est en cours de génération</Preview>
      <Body
        style={{
          backgroundColor: "#f8f6f2",
          fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif",
          color: "#2e2f2d",
          padding: 24,
        }}
      >
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 32 }}>
          <Heading style={{ fontSize: 24 }}>Bonjour {firstName},</Heading>
          <Section style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 16, lineHeight: 1.6 }}>
              Nous venons de lancer la génération de votre rendu pour le projet
              <b> {projectName}</b>. Vous recevrez un second email dès qu'il sera prêt, dans
              quelques minutes.
            </Text>
          </Section>
        </Container>
      </Body>
    </EmailRoot>
  );
}

export default ProjectConfirmation;
