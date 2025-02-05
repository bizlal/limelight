import { Text, TextLink } from "@/components/Text";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import Spacer from "./Spacer";
import Wrapper from "./Wrapper";
import styles from "./Footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <Wrapper>
        {/* Top Section: Brand + Columns */}
        <div className={styles.topSection}>
          {/* Brand / Logo Column */}
          <div className={styles.brandColumn}>
            <div className={styles.brandLogo}>
              {/* If you have a brand logo image: 
                  <img src="/images/limelight-logo.svg" alt="Limelight" /> 
                  or otherwise just text: */}
              <Text color="accents-7" weight="bold" size={1.25}>
                LIMELIGHT
              </Text>
            </div>
            <Spacer size={0.5} axis="vertical" />
            <Text color="accents-7" className={styles.brandTagline}>
              Providing artists with powerful tools to upload and share their
              music, while fans discover new favorites and directly engage with
              creators.
            </Text>
          </div>

          {/* Product Column */}
          <div className={styles.column}>
            <Text className={styles.columnTitle} weight="semibold">
              Product
            </Text>
            <Spacer size={0.5} axis="vertical" />
            <ul className={styles.linkList}>
              <li>
                <TextLink href="/feed" color="link">
                  Limelight Music
                </TextLink>
              </li>
              <li>
                <TextLink href="/download" color="link">
                  Download
                </TextLink>
              </li>
              <li>
                <TextLink href="/support" color="link">
                  Support
                </TextLink>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className={styles.column}>
            <Text className={styles.columnTitle} weight="semibold">
              Resources
            </Text>
            <Spacer size={0.5} axis="vertical" />
            <ul className={styles.linkList}>
              <li>
                <TextLink href="/blog" color="link">
                  The Blog
                </TextLink>
              </li>
              <li>
                <TextLink href="/merch" color="link">
                  Merch Store
                </TextLink>
              </li>
              <li>
                <TextLink href="/brand-press" color="link">
                  Brand / Press
                </TextLink>
              </li>
              <li>
                <TextLink href="/foundation" color="link">
                  Open Audio Foundation
                </TextLink>
              </li>
            </ul>
          </div>

          {/* Socials Column */}
          <div className={styles.column}>
            <Text className={styles.columnTitle} weight="semibold">
              Socials
            </Text>
            <Spacer size={0.5} axis="vertical" />
            <ul className={styles.linkList}>
              <li>
                <TextLink href="https://twitter.com/limelight" color="link">
                  Twitter
                </TextLink>
              </li>
              <li>
                <TextLink href="https://facebook.com/limelight" color="link">
                  Facebook
                </TextLink>
              </li>
              <li>
                <TextLink href="https://instagram.com/limelight" color="link">
                  Instagram
                </TextLink>
              </li>
              <li>
                <TextLink href="https://discord.gg/limelight" color="link">
                  Discord
                </TextLink>
              </li>
            </ul>
          </div>
        </div>

        <Spacer size={2} axis="vertical" />

        {/* Bottom Section: Theme Switcher + Copyright */}
        <div className={styles.bottomSection}>
          <ThemeSwitcher />

          <div className={styles.bottomLinks}>
            <Text color="accents-7" small>
              © 2025 Limelight. All rights reserved.
            </Text>
            <div className={styles.policies}>
              <TextLink href="/terms-of-service" color="link" small>
                Terms of Service
              </TextLink>
              <TextLink href="/privacy" color="link" small>
                Privacy Policy
              </TextLink>
            </div>
          </div>
        </div>
      </Wrapper>
    </footer>
  );
};

export default Footer;
