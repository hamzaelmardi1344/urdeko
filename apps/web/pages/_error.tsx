import type { NextPageContext } from "next";

type ErrorPageProps = {
  statusCode: number;
};

export default function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main
      style={{
        alignItems: "center",
        color: "#0E1116",
        display: "flex",
        minHeight: "100vh",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ color: "#5C6470", fontSize: 14, margin: "0 0 8px" }}>Erreur {statusCode}</p>
        <h1 style={{ fontSize: 28, margin: 0 }}>Cette page Jibi est indisponible.</h1>
        <p style={{ color: "#5C6470", fontSize: 16, margin: "12px 0 0" }}>
          Vérifie le lien de la boutique, puis réessaie.
        </p>
      </div>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => ({
  statusCode: res?.statusCode ?? err?.statusCode ?? 404,
});
