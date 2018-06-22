import {
  DASHBOARD_ACTIVE_COIN_NATIVE_OPIDS,
  DASHBOARD_ACTIVE_COIN_SENDTO,
} from '../storeType';
import { translate } from '../../translate/translate';
import { triggerToaster } from '../actionCreators';
import Config from '../../config';
import Store from '../../store';

export function sendNativeTx(coin, _payload) {
  let payload;
  let _apiMethod;

  if ((_payload.addressType === 'public' && // transparent
      _payload.sendTo.length !== 95) || !_payload.sendFrom) {
    _apiMethod = 'sendtoaddress';
  } else { // private
    _apiMethod = 'z_sendmany';
  }

  return dispatch => {
    payload = {
      mode: null,
      chain: coin,
      cmd: _apiMethod,
      rpc2cli: Config.rpc2cli,
      token: Config.token,
      params:
        (_payload.addressType === 'public' && _payload.sendTo.length !== 95) || !_payload.sendFrom ?
        (_payload.subtractFee ?
          [
            _payload.sendTo,
            _payload.amount,
            '',
            '',
            true
          ]
          :
          [
            _payload.sendTo,
            _payload.amount
          ]
        )
        :
        [
          _payload.sendFrom,
          [{
            address: _payload.sendTo,
            amount: _payload.amount
          }]
        ]
    };

    const _fetchConfig = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload }),
    };

    fetch(
      `http://127.0.0.1:${Config.safewalletPort}/shepherd/cli`,
      _fetchConfig
    )
    .catch((error) => {
      console.log(error);
      dispatch(
        triggerToaster(
          'sendNativeTx',
          'Error',
          'error'
        )
      );
    })
    .then((response) => {
      const _response = response.text().then((text) => { return text; });
      return _response;
    })
    .then((json) => {
      if (json.indexOf('"code":') > -1) {
        let _message = json.substring(
          `${json.indexOf('"message":"') + 11}`,
          json.indexOf('"},"id":"jl777"')
        );

        if (json.indexOf('"code":-4') > -1) {
          dispatch(
            triggerToaster(
              translate('API.WALLETDAT_MISMATCH'),
              translate('TOASTR.WALLET_NOTIFICATION'),
              'info',
              false
            )
          );
        } else if (json.indexOf('"code":-5') > -1) {
          dispatch(
            triggerToaster(
              translate('TOASTR.INVALID_ADDRESS', coin),
              translate('TOASTR.WALLET_NOTIFICATION'),
              'error',
            )
          );
        } else {
          if (Config.rpc2cli) {
            _message = JSON.parse(json).error.message;
          }

          dispatch(
            triggerToaster(
              _message,
              translate('TOASTR.WALLET_NOTIFICATION'),
              'error'
            )
          );
        }
      } else {
        dispatch(sendToAddressState(JSON.parse(json).result));
        dispatch(
          triggerToaster(
            translate('TOASTR.TX_SENT_ALT'),
            translate('TOASTR.WALLET_NOTIFICATION'),
            'success'
          )
        );
      }
    });
  }
}

export function getSAFEOPIDState(json) {
  return {
    type: DASHBOARD_ACTIVE_COIN_NATIVE_OPIDS,
    opids: json,
  }
}

// remove
export function getSAFEOPID(opid, coin) {
  return dispatch => {
    const payload = {
      mode: null,
      chain: coin,
      cmd: 'z_getoperationstatus',
      rpc2cli: Config.rpc2cli,
      token: Config.token,
    };

    const _fetchConfig = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload }),
    };

    fetch(
      `http://127.0.0.1:${Config.safewalletPort}/shepherd/cli`,
      _fetchConfig
    )
    .catch((error) => {
      console.log(error);
      dispatch(
        triggerToaster(
          'getSAFEOPID',
          'Error',
          'error'
        )
      );
    })
    .then(response => response.json())
    .then(json => {
      json = json.result;
      dispatch(getSAFEOPIDState(json));
    });
  };
}

export function sendToAddressPromise(coin, address, amount) {
  return new Promise((resolve, reject) => {
    const payload = {
      mode: null,
      chain: coin,
      cmd: 'sendtoaddress',
      rpc2cli: Config.rpc2cli,
      token: Config.token,
      params: [
        address,
        amount,
        'SAFE interest claim request',
        'SAFE interest claim request',
        true
      ],
    };

    const _fetchConfig = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload }),
    };

    fetch(
      `http://127.0.0.1:${Config.safewalletPort}/shepherd/cli`,
      _fetchConfig
    )
    .catch((error) => {
      console.log(error);
      Store.dispatch(
        triggerToaster(
          'sendToAddress',
          'Error',
          'error'
        )
      );
    })
    .then(response => response.json())
    .then(json => {
      resolve(json);
    });
  });
}

export function sendToAddressState(json) {
  return {
    type: DASHBOARD_ACTIVE_COIN_SENDTO,
    lastSendToResponse: json,
  }
}

export function clearLastSendToResponseState() {
  return {
    type: DASHBOARD_ACTIVE_COIN_SENDTO,
    lastSendToResponse: null,
  }
}

export function validateAddressPromise(coin, address) {
  return new Promise((resolve, reject) => {
    const payload = {
      mode: null,
      chain: coin,
      cmd: 'validateaddress',
      params: [ address ],
      rpc2cli: Config.rpc2cli,
      token: Config.token,
    };

    const _fetchConfig = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload }),
    };

    fetch(
      `http://127.0.0.1:${Config.safewalletPort}/shepherd/cli`,
      _fetchConfig
    )
    .catch((error) => {
      console.log(error);
      Store.dispatch(
        triggerToaster(
          'validateAddressPromise',
          'Error',
          'error'
        )
      );
    })
    .then(response => response.json())
    .then(json => {
      resolve(json);
    });
  });
}