import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

export interface BaseEmailProps {
  children: React.ReactNode;
  footerText?: string;
  logoUrl?: string;
  previewText: string;
  title: string;
}
// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  margin: "0 auto",
  maxWidth: "600px",
  padding: "20px 0 48px",
};

const logoContainer = {
  padding: "20px 0",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto",
  paddingTop: "20px",
};

const content = {
  backgroundColor: "#ffffff",
  borderRadius: "4px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  padding: "32px",
};

const heading = {
  color: "#215350",
  fontSize: "24px",
  fontWeight: "600",
  marginBottom: "24px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  marginTop: "20px",
  textAlign: "center" as const,
};

const footerTextStyle = {
  color: "#8898aa",
  fontSize: "12px",
};



export const BaseTemplate: React.FC<BaseEmailProps> = ({
  previewText,
  title,
  children,
  footerText = "© 2025 Klynno AI. All rights reserved.",
  logoUrl = "https://app.klynno.ai/logo-email.png",
}) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              alt="Klynno AI"
              height="36"
              src={logoUrl}
              style={logo}
              width="190"
            />
          </Section>
          <Section style={content}>
            <Heading style={heading}>{title}</Heading>
            {children}
          </Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerTextStyle}>{footerText}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};


export default BaseTemplate;
