import React from 'react';
import translate from '../../../translate/translate';
import addCoinOptionsCrypto from '../../addcoin/addcoinOptionsCrypto';
import addCoinOptionsAC from '../../addcoin/addcoinOptionsAC';
import Select from 'react-select';
import {
  triggerToaster,
  shepherdToolsBalance,
  shepherdToolsBuildUnsigned,
  shepherdToolsPushTx,
  shepherdToolsSeedToWif,
  shepherdToolsWifToKP,
  shepherdElectrumListunspent,
  shepherdCliPromise,
  shepherdElectrumSplitUtxoPromise,
} from '../../../actions/actionCreators';
import Store from '../../../store';
import { isSafecoinCoin } from '../../../util/coinHelper';
import devlog from '../../../util/devlog';

const shell = window.require('electron').shell;

class ToolsMergeUTXO extends React.Component {
  constructor() {
    super();
    this.state = {
      utxoMergeAddress: null,
      utxoMergeWif: null,
      utxoMergeSeed: '',
      utxoMergeCoin: '',
      utxoMergeUtxoNum: 10,
      utxoMergeRawtx: null,
      utxoMergeList: null,
      utxoMergePushResult: null,
      utxoMergeShowUtxoList: false,
    };
    this.updateInput = this.updateInput.bind(this);
    this.updateSelectedCoin = this.updateSelectedCoin.bind(this);
    this.getUtxoMerge = this.getUtxoMerge.bind(this);
    this.mergeUtxo = this.mergeUtxo.bind(this);
    this.toggleMergeUtxoList = this.toggleMergeUtxoList.bind(this);
  }

  toggleMergeUtxoList() {
    this.setState({
      utxoMergeShowUtxoList: !this.state.utxoMergeShowUtxoList,
    });
  }

  mergeUtxo() {
    const wif = this.state.utxoMergeWif;
    const address = this.state.utxoMergeAddress;
    const utxoNum = this.state.utxoMergeUtxoNum;
    let totalOutSize = 0;
    let _utxos = [];
    let _interest = 0;

    for (let i = 0; i < utxoNum; i++) {
      devlog(`vout ${i} ${this.state.utxoMergeList[i].amount}`);
      _utxos.push(JSON.parse(JSON.stringify(this.state.utxoMergeList[i])));
      totalOutSize += Number(this.state.utxoMergeList[i].amount);
    }

    for (let i = 0; i < _utxos.length; i++) {
      _utxos[i].amount = Number(_utxos[i].amount) * 100000000;
      _utxos[i].interest = Number(_utxos[i].interest) * 100000000;
      _interest += (_utxos[i].interest ? _utxos[i].interest : 0);
    }

    devlog(`total out size ${totalOutSize}`);
    devlog(`interest ${_interest}`);

    const payload = {
      wif,
      network: 'safecoin',
      targets: [Math.floor(totalOutSize * 100000000) - 10000 + _interest],
      utxo: _utxos,
      changeAddress: address,
      outputAddress: address,
      change: 0,
    };

    console.log(payload);

    shepherdElectrumSplitUtxoPromise(payload)
    .then((res) => {
      devlog(res);

      if (res.msg === 'success') {
        const _coin = this.state.utxoMergeCoin.split('|');

        shepherdCliPromise(
          null,
          _coin[0],
          'sendrawtransaction',
          [res.result]
        )
        .then((res) => {
          devlog(res);

          if (!res.error) {
            this.setState({
              utxoMergePushResult: res.result,
            });
            Store.dispatch(
              triggerToaster(
                translate('TOOLS.MERGE_SUCCESS'),
                'UTXO',
                'success'
              )
            );
          } else {
            Store.dispatch(
              triggerToaster(
                res.result,
                translate('TOOLS.ERR_MERGE_UTXO'),
                'error'
              )
            );
          }
        });
      } else {
        Store.dispatch(
          triggerToaster(
            res.result,
            translate('TOOLS.ERR_MERGE_UTXO'),
            'error'
          )
        );
      }
    });
  }

  getUtxoMerge() {
    const _coin = this.state.utxoMergeCoin.split('|');

    shepherdToolsSeedToWif(
      this.state.utxoMergeSeed,
      'SAFE',
      true
    )
    .then((seed2kpRes) => {
      if (seed2kpRes.msg === 'success') {
        shepherdCliPromise(null, _coin[0], 'listunspent')
        .then((res) => {
          // devlog(res);

          if (!res.error) {
            const _utxoList = res.result;
            let largestUTXO = 0;

            if (_utxoList &&
                _utxoList.length) {
              let _mineUtxo = [];

              for (let i = 0; i < _utxoList.length; i++) {
                if (_utxoList[i].spendable &&
                    seed2kpRes.result.keys.pub === _utxoList[i].address) {
                  _mineUtxo.push(_utxoList[i]);
                }
              }

              this.setState({
                utxoMergeList: _mineUtxo,
                utxoMergeAddress: seed2kpRes.result.keys.pub,
                utxoMergeWif: seed2kpRes.result.keys.priv,
                utxoMergeUtxoNum: _mineUtxo.length,
              });
            } else {
              Store.dispatch(
                triggerToaster(
                  translate('TOOLS.ERR_MERGE_UTXO'),
                  translate('TOOLS.NO_VALID_UTXO'),
                  'error'
                )
              );
            }
          } else {
            Store.dispatch(
              triggerToaster(
                res.result,
                translate('TOOLS.ERR_MERGE_UTXO'),
                'error'
              )
            );
          }
        });
      } else {
        Store.dispatch(
          triggerToaster(
            seed2kpRes.result,
            translate('TOOLS.ERR_SEED_TO_WIF'),
            'error'
          )
        );
      }
    });
  }

  renderCoinOption(option) {
    return (
      <div>
        <img
          src={ `assets/images/cryptologo/${option.icon.toLowerCase()}.png` }
          alt={ option.label }
          width="30px"
          height="30px" />
        <span className="margin-left-10">{ option.label }</span>
      </div>
    );
  }

  updateSelectedCoin(e, propName) {
    if (e &&
        e.value &&
        e.value.indexOf('|')) {
      this.setState({
        [propName]: e.value,
      });
    }
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  openExplorerWindow(txid, coin) {
    const url = `http://${coin}.explorer.ipv6admin.com/tx/${txid}`;
    return shell.openExternal(url);    
  }

  renderUTXOSplitMergeResponse(type) {
    const _utxos = type === 'merge' ? this.state.utxoMergeList : this.state.utxoSplitList;
    let _items = [];

    if (_utxos &&
        _utxos.length) {
      for (let i = 0; i < _utxos.length; i++) {
        _items.push(
          <tr key={ `tools-utxos-${i}` }>
            <td>{ _utxos[i].amount }</td>
            <td>{ _utxos[i].address }</td>
            <td>{ _utxos[i].confirmations }</td>
            <td>{ _utxos[i].vout }</td>
            <td>{ _utxos[i].txid }</td>
          </tr>
        );
      }
    }

    return (
      <table className="table table-hover dataTable table-striped">
        <thead>
          <tr>
            <th>{ translate('TOOLS.AMOUNT') }</th>
            <th>{ translate('TOOLS.ADDRESS') }</th>
            <th>{ translate('TOOLS.CONFS') }</th>
            <th>{ translate('TOOLS.VOUT') }</th>
            <th>TxID</th>
          </tr>
        </thead>
        <tbody>
        { _items }
        </tbody>
        <tfoot>
          <tr>
            <th>{ translate('TOOLS.AMOUNT') }</th>
            <th>{ translate('TOOLS.ADDRESS') }</th>
            <th>{ translate('TOOLS.CONFS') }</th>
            <th>{ translate('TOOLS.VOUT') }</th>
            <th>TxID</th>
          </tr>
        </tfoot>
      </table>
    );
  }

  render() {
    return (
      <div className="row margin-left-10">
        <div className="col-xlg-12 form-group form-material no-padding-left padding-bottom-10">
          <h4>{ translate('TOOLS.MERGE') } UTXO</h4>
        </div>
        <div className="col-xlg-12 form-group form-material no-padding-left padding-top-20 padding-bottom-50">
          <label
            className="control-label col-sm-1 no-padding-left"
            htmlFor="safeWalletSendTo">{ translate('TOOLS.COIN') }</label>
          <Select
            name="utxoMergeCoin"
            className="col-sm-3"
            value={ this.state.utxoMergeCoin }
            onChange={ (event) => this.updateSelectedCoin(event, 'utxoMergeCoin') }
            optionRenderer={ this.renderCoinOption }
            valueRenderer={ this.renderCoinOption }
            options={ [{
                label: 'Safecoin (SAFE)',
                icon: 'SAFE',
                value: `SAFE|native`,
              }].concat(addCoinOptionsAC())
            } />
        </div>
        <div className="col-sm-12 form-group form-material no-padding-left">
          <label
            className="control-label col-sm-1 no-padding-left"
            htmlFor="safeWalletSendTo">{ translate('TOOLS.SEED') }</label>
          <input
            type="text"
            className="form-control col-sm-3"
            name="utxoMergeSeed"
            onChange={ this.updateInput }
            value={ this.state.utxoMergeSeed }
            placeholder={ translate('TOOLS.ENTER_A_SEED') }
            autoComplete="off"
            required />
        </div>
        { this.state.utxoMergeAddress &&
          <div className="col-sm-12 form-group form-material no-padding-left margin-top-10">
            Pub: { this.state.utxoMergeAddress }
          </div>
        }
        { this.state.utxoMergeAddress &&
          <div className="col-sm-12 form-group form-material no-padding-left margin-top-10">
            WIF: { this.state.utxoMergeWif }
          </div>
        }
        <div className="col-sm-12 form-group no-padding-left margin-top-20 padding-bottom-10">
          <button
            type="button"
            className="btn btn-info col-sm-2"
            onClick={ this.getUtxoMerge }>
            { translate('TOOLS.GET_UTXO') }
          </button>
        </div>
        { this.state.utxoMergeList &&
          <div className="col-sm-12 form-group form-material no-padding-left margin-top-10">
            <div>{ translate('TOOLS.TOTAL') } UTXO: { this.state.utxoMergeList.length }</div>
          </div>
        }
        <div className="col-sm-12 form-group form-material no-padding-left margin-top-10">
          <label className="switch">
            <input
              type="checkbox"
              checked={ this.state.utxoMergeShowUtxoList } />
            <div
              className="slider"
              onClick={ this.toggleMergeUtxoList }></div>
          </label>
          <div
            className="toggle-label margin-right-15 pointer iguana-core-toggle"
            onClick={ this.toggleMergeUtxoList }>
            { translate('TOOLS.SHOW_UTXO_LIST') }
          </div>
        </div>
        { this.state.utxoMergeShowUtxoList &&
          <div className="col-sm-12 form-group form-material no-padding-left margin-top-10">
            { this.renderUTXOSplitMergeResponse('merge') }
          </div>
        }
        <div className="col-sm-12 form-group form-material no-padding-left padding-top-20 padding-bottom-20">
          <label
            className="control-label col-sm-2 no-padding-left"
            htmlFor="safeWalletSendTo">{ translate('TOOLS.UTXO_COUNT_TO_MERGE') }</label>
          <input
            type="text"
            className="form-control col-sm-3"
            name="utxoMergeUtxoNum"
            onChange={ this.updateInput }
            value={ this.state.utxoMergeUtxoNum }
            placeholder={ translate('TOOLS.UTXO_COUNT') }
            autoComplete="off"
            required />
        </div>
        <div className="col-sm-12 form-group form-material no-padding-left margin-top-10 padding-bottom-10">
          <button
            type="button"
            className="btn btn-info col-sm-2"
            onClick={ this.mergeUtxo }>
            { translate('TOOLS.MERGE_UTXO') }
          </button>
        </div>
        { /*this.state.utxoMergeRawtx &&
          <div className="col-sm-12 form-group form-material no-padding-left margin-top-10">
            Rawtx: <div style={{ wordBreak: 'break-all' }}>{ this.state.utxoMergeRawtx }</div>
          </div>*/
        }
        { this.state.utxoMergePushResult &&
          <div className="col-sm-12 form-group form-material no-padding-left margin-top-10">
            TXID: <div style={{ wordBreak: 'break-all' }}>{ this.state.utxoMergePushResult }</div>
            { isSafecoinCoin(this.state.utxoMergeCoin.split('|')[0]) &&
              <div className="margin-top-10">
                <button
                  type="button"
                  className="btn btn-sm white btn-dark waves-effect waves-light pull-left"
                  onClick={ () => this.openExplorerWindow(this.state.utxoMergePushResult, this.state.utxoMergeCoin.split('|')[0]) }>
                  <i className="icon fa-external-link"></i> { translate('INDEX.OPEN_TRANSACTION_IN_EPLORER', this.state.utxoMergeCoin.split('|')[0]) }
                </button>
              </div>
            }
          </div>
        }
      </div>
    );
  }
}

export default ToolsMergeUTXO;