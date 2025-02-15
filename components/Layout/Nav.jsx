import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
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

// ---- Custom Hook to Fetch Balances ----
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function vestedBalanceOf(address) view returns (uint256)',
];

const LMLT_CONTRACT = '0x041040e0A67150BCaf126456b52751017f1c368E';

// Example providers
const baseProvider = new ethers.providers.JsonRpcProvider(
  'https://mainnet.base.org'
);
const ethProvider = new ethers.providers.JsonRpcProvider(
  'https://84532.rpc.thirdweb.com/a34344b907a4dd3c2811807c82a1b4bd'
);

function formatBalance(balance) {
  if (balance >= 1e9) return (balance / 1e9).toFixed(2) + 'B';
  if (balance >= 1e6) return (balance / 1e6).toFixed(2) + 'M';
  if (balance >= 1e3) return (balance / 1e3).toFixed(2) + 'K';
  return balance.toFixed(2);
}

function useBalances(address) {
  const [ethBalance, setEthBalance] = useState(null);
  const [lmltBalance, setLmltBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        // ---- 1) Fetch ETH balance on Ethereum ----
        const weiBalance = await ethProvider.getBalance(address);
        const ethBal = parseFloat(ethers.utils.formatEther(weiBalance));

        // ---- 2) Fetch LMLT (Base) ----
        const lmltContract = new ethers.Contract(LMLT_CONTRACT, ERC20_ABI, baseProvider);
        const rawBalance = await lmltContract.balanceOf(address);
        const decimals = await lmltContract.decimals();
        const lmltFloat = parseFloat(ethers.utils.formatUnits(rawBalance, decimals));

        if (isMounted) {
          setEthBalance(ethBal);
          setLmltBalance(lmltFloat);
        }
      } catch (err) {
        console.error('Error fetching balances:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [address]);

  return { ethBalance, lmltBalance, loading };
}

// ---- Balances Component ----
export function Balances({ address }) {
  const { ethBalance, lmltBalance, loading } = useBalances(address);

  if (!address) return null;

  return (
    <div className="balanceContainer">
      {loading ? (
        <span>Loading Balances...</span>
      ) : (
        <>
          {/* Truncated address */}
          <div className="addressRow">
            <span className="addressLabel">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>

          {/* ETH Balance */}
          <div className="chainRow">
            <span className="chainLabel">Ethereum</span>
            <span className="chainBalance">
              {ethBalance !== null ? `${formatBalance(ethBalance)} ETH` : '0 ETH'}
            </span>
          </div>

          {/* LMLT Balance */}
          <div className="chainRow">
            <span className="chainLabel">LMLT (Base)</span>
            <span className="chainBalance">
              {lmltBalance !== null ? `${formatBalance(lmltBalance)} LMLT` : '0 LMLT'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ---- User Menu ----
const UserMenu = ({ user, onDisconnect }) => {
  const menuRef = useRef(null);
  const avatarRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const { user: privyUser } = usePrivy();

  // Close if route changes
  useEffect(() => {
    const onRouteChangeComplete = () => setVisible(false);
    router.events.on('routeChangeComplete', onRouteChangeComplete);
    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete);
    };
  }, [router.events]);

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
    <div className="userMenu">
      <button
        className="trigger"
        ref={avatarRef}
        onClick={() => setVisible(!visible)}
      >
        <div className="avatarContainer">
          <Avatar
            size={32}
            url={user.profileImage || '/default-avatar.png'}
            username={user.username || 'NoUsername'}
          />
          <span className="userName">{user.username}</span>
        </div>
      </button>

      {visible && (
        <div
          ref={menuRef}
          role="menu"
          aria-hidden={!visible}
          className="popover"
        >
          <div className="menu">
            {/* Balances */}
            <Balances address={privyUser?.wallet?.address} />

            <div className="menuTopRow">
              <Link href={`/user/${user.username}`} className="menuItem">
                <FaUser className="menuIcon" />
                Profile
              </Link>
              <Link href="/settings" className="menuItem">
                <FaCog className="menuIcon" />
                Settings
              </Link>
            </div>

            <Link href="/new-release" className={`menuItem uploadBtn`}>
              <FaUpload className="menuIcon" />
              Upload Music
            </Link>

            <div className={`menuItem themeRow`}>
              <FaAdjust className="menuIcon" />
              <span>Theme</span>
              <Spacer size={0.5} axis="horizontal" />
              <ThemeSwitcher />
            </div>

            <button onClick={onDisconnect} className="menuItem">
              <FaSignOutAlt className="menuIcon" />
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
  const { ready, authenticated, user: privyUser, login, logout, getAccessToken } = usePrivy();

  const [localUser, setLocalUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [serverLoggedIn, setServerLoggedIn] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Fetch local user doc from your DB once Privy is ready
  useEffect(() => {
    if (!ready || !authenticated || !privyUser?.id) {
      setLocalUser(null);
      setServerLoggedIn(false);
      return;
    }

    if (router.pathname === '/sign-up') return;

    fetcher(`/api/user?uid=${encodeURIComponent(privyUser.id)}`)
      .then((res) => {
        if (!res.user || !res.user.username) {
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
    <nav className="nav">
      <Wrapper className="wrapper">
        <Container
          className="content"
          alignItems="center"
          justifyContent="space-between"
        >
          {/* LEFT SECTION */}
          <Container alignItems="center" className="leftSection">
            <Link href="/" legacyBehavior>
              <span className="logoText">
                limelight <span className="beta">beta</span>
              </span>
            </Link>

            <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
              <span className="hamburgerLine" />
              <span className="hamburgerLine" />
              <span className="hamburgerLine" />
            </button>
          </Container>

          {/* MIDDLE SECTION */}
          <div className={`navCenter ${mobileOpen ? 'navCenterOpen' : ''}`}>
            <div className="navLinks">
              <Link legacyBehavior href="/feed">
                <a className="navLink">Feed</a>
              </Link>
              <Link legacyBehavior href="/discover">
                <a className="navLink">Discover</a>
              </Link>
              <Link legacyBehavior href="/library">
                <a className="navLink">Library</a>
              </Link>
              <Link legacyBehavior href="/top-charts">
                <a className="navLink">Top Charts</a>
              </Link>
              <Link legacyBehavior href="/playlist">
                <a className="navLink">Playlist</a>
              </Link>
              {/* ---- New Token link ---- */}
              <Link legacyBehavior href="/token">
                <a className="navLink">Token</a>
              </Link>
            </div>
            <div className="searchContainer">
              <input
                className="searchInput"
                type="search"
                placeholder="Search..."
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>

          {/* RIGHT SECTION */}
          <div className="rightSection">
            {authenticated ? (
              localUser?.username ? (
                <UserMenu user={localUser} onDisconnect={handleDisconnect} />
              ) : (
                <Button size="small" onClick={handleDisconnect} type="error">
                  Disconnect
                </Button>
              )
            ) : (
              <div className="authButtons">
                <button disabled={disableConnect} onClick={login} className="loginBtn">
                  Sign In / Sign Up
                </button>
              </div>
            )}
          </div>
        </Container>
      </Wrapper>

      {/* --- Overlay that blurs the view when search is focused --- */}
      <div className={`blurOverlay ${isSearchFocused ? 'blurOverlayVisible' : ''}`} />
    </nav>
  );
};

export default Nav;
