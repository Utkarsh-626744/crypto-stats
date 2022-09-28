import React, { Component } from "react";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";
import { apiGetAccountAssets } from "./apis";
window.Buffer = window.Buffer || require("buffer").Buffer;

const INITIAL_STATE = {
  connector: null,
  fetching: false,
  connected: false,
  chainId: 1,
  showModal: false,
  pendingRequest: false,
  uri: "",
  accounts: [],
  address: "vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv",
  result: null,
  assets: [],
  balance: "-",
};

export default class App extends Component {
  state = {
    ...INITIAL_STATE,
  };

  connect = async () => {
    // bridge url
    const bridge = "https://bridge.walletconnect.org";

    // create new connector
    const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal });

    await this.setState({ connector });

    // check if already connected
    if (!connector.connected) {
      // create new session
      await connector.createSession();
    }

    // subscribe to events
    await this.subscribeToEvents();
  };
  subscribeToEvents = () => {
    const { connector } = this.state;

    if (!connector) {
      return;
    }

    connector.on("session_update", async (error, payload) => {
      console.log(`connector.on("session_update")`);

      if (error) {
        throw error;
      }

      const { chainId, accounts } = payload.params[0];
      this.onSessionUpdate(accounts, chainId);
    });

    connector.on("connect", (error, payload) => {
      console.log(`connector.on("connect")`, payload);

      if (error) {
        throw error;
      }

      this.onConnect(payload);
    });

    connector.on("disconnect", (error, payload) => {
      console.log(`connector.on("disconnect")`);

      if (error) {
        throw error;
      }

      this.onDisconnect();
    });

    if (connector.connected) {
      // console.log(connector);
      const { chainId, accounts } = connector;
      const address = accounts[0];
      this.setState({
        connected: true,
        chainId,
        accounts,
        address,
      });
      this.onSessionUpdate(accounts, chainId);
    }

    this.setState({ connector });
  };

  killSession = async () => {
    const { connector } = this.state;
    if (connector) {
      connector.killSession();
    }
    this.resetApp();
  };

  resetApp = async () => {
    this.setState({ ...INITIAL_STATE });
  };

  onConnect = async (payload) => {
    const { chainId, accounts } = payload.params[0];
    const address = accounts[0];
    this.setState(
      {
        connected: true,
        chainId,
        accounts,
        address,
      },
      () => {
        this.getAccountAssets();
      }
    );
  };

  onDisconnect = async () => {
    this.resetApp();
  };

  onSessionUpdate = async (accounts, chainId) => {
    const address = accounts[0];
    this.setState({ chainId, accounts, address }, () => {
      this.getAccountAssets();
    });
  };

  getAccountAssets = async () => {
    const { address, chainId } = this.state;
    this.setState({ fetching: true });
    try {
      // get account balances
      const assets = await apiGetAccountAssets(address, chainId);

      this.setState({ fetching: false, address, assets });
    } catch (error) {
      console.error(error);
      this.setState({ fetching: false });
    }
  };

  onCryptoChange = (event) => {
    this.setState({ ...this.state, balance: event.target.value });
  };

  render() {
    const {
      assets,
      address,
      connected,
      fetching,
      balance,
    } = this.state;
    console.log(assets);

    return (
      <>
        <div style={{maxWidth: 700}} className="container mx-lg-auto mt-4">
          <nav className="navbar navbar-expand-lg">
            <div className="container-fluid">
              <span className="navbar-brand">
                Crypto Stats
              </span>
              {connected ? <button onClick={this.killSession} className="btn btn-danger">
                disconnect
              </button> : <button disabled={fetching} onClick={this.connect} className="btn btn-primary">connect</button>}
              {/* <div className="collapse navbar-collapse justify-content-end">
              </div> */}
            </div>
          </nav>

          {/* connected &&  */address ? <div className="container">
            <div className="my-3">
              Wallet Address <span className="text-info text-break">{address}</span>
            </div>
            <div className="mt-2">
              <div className="row">
              <div className="col-12 mb-3">
                  <h3>Balance</h3>
                  <h4>
                    <span>{balance}</span>
                  </h4>
                </div>
                <div className="col-12">
                  <select className="form-select" onChange={this.onCryptoChange}>
                    <option value="-">Select crypto</option>
                    {assets.map((asset) => (
                      <option key={asset.name} value={asset.balance}>{asset.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div> : (<div className="container">
            <small>No wallet connected yet</small>
          </div>)}

        </div>
      </>

    );
  }
}
