import { InjectedConnector } from "@web3-react/injected-connector";
import { ACTIVE_NETWORK, INFURA_ID } from "../constants";
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import WalletConnectApi from '@walletconnect/web3-subprovider'
/**
 * @name Injected
 * @description https://github.com/NoahZinsmeister/web3-react/blob/v6/docs/connectors/injected.md
 */
export const injected = new InjectedConnector({
  supportedChainIds: [ACTIVE_NETWORK],
});

/**
 * @name walletconnect
 * @description https://github.com/NoahZinsmeister/web3-react/blob/v6/docs/connectors/walletconnect.md
 */

export const walletconnect = new WalletConnectConnector({
  api: WalletConnectApi,
  bridge: 'https://safe-walletconnect.gnosis.io',
  qrcode: true,
  rpc: {1: "https://mainnet.infura.io/v3/" + INFURA_ID},
  defaultNetwork: 1,
})

/**
 * @name Fortmatic
 * @description https://github.com/NoahZinsmeister/web3-react/blob/v6/docs/connectors/fortmatic.md
 */
/**
 * @name connectorsByName
 * @description Object of the available connection methods
 */
export const connectorsByName = {
  INJECTED: injected,
  WALLETCONNECT: walletconnect
};

/**
 * @name SUPPORTED_WALLETS
 */
export const SUPPORTED_WALLETS = {
  INJECTED: {
    name: "Injected",
    description: "Login using a browser extension",
    color: "#E8831D",
    primary: true,
    icon: "/metamask-icon.svg",
  },
  METAMASK: {
    name: "MetaMask",
    description: "Login using Metamask",
    color: "#E8831D",
    icon: "/metamask-icon.svg",
  },
  WALLETCONNECT: {
    name: "WalletConnect",
    description: "Login using WalletConnect",
    color: "#E8831D",
    icon: "/walletconnect-icon.svg",
  },
};
