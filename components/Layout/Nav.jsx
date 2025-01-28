import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { usePrivy } from '@privy-io/react-auth';
// Ethers for reading balances
import { ethers } from 'ethers';
// 1) Import react-icons
import {
  FaUser,
  FaCog,
  FaUpload,
  FaSignOutAlt,
  FaAdjust,
} from 'react-icons/fa';

import { fetcher } from '@/lib/fetch';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import Spacer from './Spacer';
import Container from './Container';
import Wrapper from './Wrapper';

import styles from './Nav.module.css';
// Simple ERC-20 ABI for balanceOf, symbol, decimals, etc.
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  // If your contract actually has a "vestedBalanceOf" method:
  'function vestedBalanceOf(address) view returns (uint256)',
];

// Or if you have a separate vesting contract, define that address + ABI here.
const LMLT_CONTRACT = '0x041040e0A67150BCaf126456b52751017f1c368E';

// Example providers
const baseProvider = new ethers.providers.JsonRpcProvider(
  'https://mainnet.base.org'
);
const ethProvider = new ethers.providers.JsonRpcProvider(
  'https://8453.rpc.thirdweb.com/a34344b907a4dd3c2811807c82a1b4bd'
);

// Helper for large-number formatting (“K”, “M”, “B”)
function formatBalance(balance) {
  if (balance >= 1e9) return (balance / 1e9).toFixed(2) + 'B';
  if (balance >= 1e6) return (balance / 1e6).toFixed(2) + 'M';
  if (balance >= 1e3) return (balance / 1e3).toFixed(2) + 'K';
  return balance.toFixed(2);
}

export function Balances({ address }) {
  const [ethBalance, setEthBalance] = useState(null);
  const [lmltBalance, setLmltBalance] = useState(null);
  // const [vestedBalance, setVestedBalance] = useState(null); // NEW
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;

    let isMounted = true;
    (async () => {
      try {
        setLoading(true);

        // 1) Fetch ETH balance on Ethereum
        const weiBalance = await ethProvider.getBalance(address);
        const ethBal = parseFloat(ethers.utils.formatEther(weiBalance));

        // 2) Fetch LMLT + Vested from Base
        const lmltContract = new ethers.Contract(
          LMLT_CONTRACT,
          ERC20_ABI,
          baseProvider
        );

        // Normal LMLT
        const rawBalance = await lmltContract.balanceOf(address);
        const decimals = await lmltContract.decimals();
        const lmltFloat = parseFloat(
          ethers.utils.formatUnits(rawBalance, decimals)
        );

        // Vested LMLT (assuming the same contract has a "vestedBalanceOf")
        // If it's a separate contract, just define another contract instance/call:
        // let vestedFloat = 0;
        // if (lmltContract.vestedBalanceOf) {
        //   const rawVested = await lmltContract.vestedBalanceOf(address);
        //   vestedFloat = parseFloat(ethers.utils.formatUnits(rawVested, decimals));
        // } else {
        //   // fallback or skip if not applicable
        // }

        if (isMounted) {
          setEthBalance(ethBal);
          setLmltBalance(lmltFloat);
          // setVestedBalance(vestedFloat);
        }
      } catch (err) {
        console.error('Error fetching balances:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [address]);

  if (!address) return null;

  return (
    <div className={styles.balanceContainer}>
      {loading ? (
        <span>Loading Balances...</span>
      ) : (
        <>
          {/* 1) Truncated address */}
          <div className={styles.addressRow}>
            <span className={styles.addressLabel}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>

          {/* 2) ETH Balance */}
          <div className={styles.chainRow}>
            <span className={styles.chainLabel}>Ethereum</span>
            <span className={styles.chainBalance}>
              {ethBalance !== null
                ? `${formatBalance(ethBalance)} ETH`
                : '0 ETH'}
            </span>
          </div>

          {/* 3) LMLT Balance */}
          <div className={styles.chainRow}>
            <span className={styles.chainLabel}>LMLT (Base)</span>
            <span className={styles.chainBalance}>
              {lmltBalance !== null
                ? `${formatBalance(lmltBalance)} LMLT`
                : '0 LMLT'}
            </span>
          </div>

          {/* 4) Vested LMLT - NEW */}
          {/* <div className={styles.chainRow}>
            <span className={styles.chainLabel}>Vested</span>
            <span className={styles.chainBalance}>
              {vestedBalance !== null ? `${formatBalance(vestedBalance)} LMLT` : '0 LMLT'}
            </span>
          </div> */}
        </>
      )}
    </div>
  );
}

// The user menu
const UserMenu = ({ user, onDisconnect }) => {
  const menuRef = useRef(null);
  const avatarRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onRouteChangeComplete = () => setVisible(false);
    router.events.on('routeChangeComplete', onRouteChangeComplete);
    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete);
    };
  }, [router.events]);
  const { user: privyUser } = usePrivy();

  // Close if outside click
  useEffect(() => {
    const onMouseDown = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        avatarRef.current &&
        !avatarRef.current.contains(event.target)
      ) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);
  return (
    <div className={styles.userMenu}>
      <button
        className={styles.trigger}
        ref={avatarRef}
        onClick={() => setVisible(!visible)}
      >
        <div className={styles.avatarContainer}>
          <Avatar
            size={32}
            url={user.profileImage || '/default-avatar.png'}
            username={user.username || 'NoUsername'}
          />
          <span className={styles.userName}>{user.username}</span>
        </div>
      </button>

      {visible && (
        <div
          ref={menuRef}
          role="menu"
          aria-hidden={!visible}
          className={styles.popover}
        >
          <div className={styles.menu}>
            {/* Show balances at the top, for example */}
            <Balances address={privyUser.wallet.address} />

            <div className={styles.menuTopRow}>
              <Link href={`/user/${user.username}`} className={styles.menuItem}>
                <FaUser className={styles.menuIcon} />
                Profile
              </Link>
              <Link href="/settings" className={styles.menuItem}>
                <FaCog className={styles.menuIcon} />
                Settings
              </Link>
            </div>

            <Link
              href="/new-release"
              className={`${styles.menuItem} ${styles.uploadBtn}`}
            >
              <FaUpload className={styles.menuIcon} />
              Upload Music
            </Link>

            <div className={`${styles.menuItem} ${styles.themeRow}`}>
              <FaAdjust className={styles.menuIcon} />
              <span>Theme</span>
              <Spacer size={0.5} axis="horizontal" />
              <ThemeSwitcher />
            </div>

            <button onClick={onDisconnect} className={styles.menuItem}>
              <FaSignOutAlt className={styles.menuIcon} />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Nav = () => {
  const router = useRouter();

  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout,
    getAccessToken,
  } = usePrivy();

  const [localUser, setLocalUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [serverLoggedIn, setServerLoggedIn] = useState(false);

  // Fetch local user doc from your DB once Privy is ready
  useEffect(() => {
    if (!ready || !authenticated || !privyUser?.id) {
      setLocalUser(null);
      setServerLoggedIn(false);
      return;
    }

    if (router.pathname === '/sign-up') {
      return;
    }
    fetcher(`/api/user?uid=${encodeURIComponent(privyUser.id)}`)
      .then((res) => {
        if (!res.user) {
          router.push('/sign-up');
          return;
        }
        if (!res.user.username) {
          router.push('/sign-up');
          return;
        }
        setLocalUser(res.user);
      })
      .catch((err) => {
        console.error('Error fetching local user doc:', err);
        router.push('/sign-up');
      });
  }, [ready, authenticated, privyUser?.id, router]);

  // Once we have a valid localUser, do server-based login if not done
  useEffect(() => {
    const doServerSideLogin = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          console.warn('No Privy token found, cannot server-login');
          return;
        }
        await fetch('/api/privy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setServerLoggedIn(true);
      } catch (err) {
        console.error('Server login via /api/privy failed:', err);
      }
    };
    if (localUser?.username && !serverLoggedIn) {
      doServerSideLogin();
    }
  }, [localUser?.username, serverLoggedIn, getAccessToken]);

  // Disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      await logout();
      setLocalUser(null);
      setServerLoggedIn(false);
      toast.success('Disconnected');
      router.push('/');
    } catch (err) {
      console.error(err);
      toast.error('Error disconnecting');
    }
  }, [logout, router]);

  const disableConnect = !ready || (ready && authenticated);

  return (
    <nav className={styles.nav}>
      <Wrapper className={styles.wrapper}>
        <Container
          className={styles.content}
          alignItems="center"
          justifyContent="space-between"
        >
          {/* LEFT SECTION */}
          <Container alignItems="center" className={styles.leftSection}>
            <Link legacyBehavior href="/">
              <span className={styles.logoText}>
                limelight <span className={styles.beta}>beta</span>
              </span>
            </Link>

            {authenticated && localUser?.username && (
              <div className={styles.leftUserDisplay}>
                <Avatar
                  size={32}
                  url={localUser.profilePicture || '/default-avatar.png'}
                  username={localUser.username}
                />
                <span className={styles.userNameLeft}>
                  {localUser.username}
                </span>
              </div>
            )}

            <button
              className={styles.hamburger}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
            </button>
          </Container>

          {/* MIDDLE SECTION */}
          <div
            className={`${styles.navCenter} ${
              mobileOpen ? styles.navCenterOpen : ''
            }`}
          >
            <div className={styles.navLinks}>
              <Link legacyBehavior href="/feed">
                <a className={styles.navLink}>Feed</a>
              </Link>
              <Link legacyBehavior href="/discover">
                <a className={styles.navLink}>Discover</a>
              </Link>
              <Link legacyBehavior href="/library">
                <a className={styles.navLink}>Library</a>
              </Link>
              <Link legacyBehavior href="/top-charts">
                <a className={styles.navLink}>Top Charts</a>
              </Link>
              <Link legacyBehavior href="/playlist">
                <a className={styles.navLink}>Playlist</a>
              </Link>
            </div>
            <div className={styles.searchContainer}>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search..."
              />
            </div>
          </div>

          {/* RIGHT SECTION */}
          <div className={styles.rightSection}>
            {authenticated ? (
              localUser?.username ? (
                <UserMenu user={localUser} onDisconnect={handleDisconnect} />
              ) : (
                <Button size="small" onClick={handleDisconnect} type="error">
                  Disconnect
                </Button>
              )
            ) : (
              <div className={styles.authButtons}>
                <button
                  disabled={disableConnect}
                  onClick={login}
                  className={styles.loginBtn}
                >
                  Sign In / Sign Up
                </button>
              </div>
            )}
          </div>
        </Container>
      </Wrapper>
    </nav>
  );
};

export default Nav;
