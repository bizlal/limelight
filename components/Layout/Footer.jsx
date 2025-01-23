import { Text, TextLink } from '@/components/Text';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import styles from './Footer.module.css';
import Spacer from './Spacer';
import Wrapper from './Wrapper';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <Wrapper>
        <Text color="accents-7">
          Made with ❤️, 🔥, and a keyboard by{' '}
          <TextLink href="https://limelight.com/" color="link">
            Limelight
          </TextLink>
          . Providing artists with powerful tools to upload and share their
          music, while fans discover new favorites and directly engage with
          creators.
        </Text>
        <Spacer size={1} axis="vertical" />
        <div className={styles.socialLinks}>
          <TextLink href="https://twitter.com/limelight" color="link">
            Twitter
          </TextLink>
          <TextLink href="https://facebook.com/limelight" color="link">
            Facebook
          </TextLink>
          <TextLink href="https://instagram.com/limelight" color="link">
            Instagram
          </TextLink>
        </div>
        <Spacer size={1} axis="vertical" />
        <ThemeSwitcher />
      </Wrapper>
    </footer>
  );
};

export default Footer;
