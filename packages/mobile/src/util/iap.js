import Purchases from 'react-native-purchases';
import { captureException } from 'loot-core/src/platform/exceptions';

// This should stay in sync with the enum in RCPurchasesErrors.h
function RCPurchasesErrorDescription(code) {
  let errors = [
    'RCUnknownError',
    'RCPurchaseCancelledError',
    'RCStoreProblemError',
    'RCPurchaseNotAllowedError',
    'RCPurchaseInvalidError',
    'RCProductNotAvailableForPurchaseError',
    'RCProductAlreadyPurchasedError',
    'RCReceiptAlreadyInUseError',
    'RCInvalidReceiptError',
    'RCMissingReceiptFileError',
    'RCNetworkError',
    'RCInvalidCredentialsError',
    'RCUnexpectedBackendResponseError',
    'RCReceiptInUseByOtherSubscriberError',
    'RCInvalidAppUserIdError',
    'RCOperationAlreadyInProgressError',
    'RCUnknownBackendError',
    'RCInvalidAppleSubscriptionKeyError',
    'RCIneligibleError',
    'RCInsufficientPermissionsError',
    'RCPaymentPendingError',
    'RCInvalidSubscriberAttributesError'
  ];

  return errors[code];
}

let IS_SETUP = false;

export async function setupPurchases(userData) {
  // eslint-disable-next-line
  // Purchases.debugLogsEnabled = __DEV__;
  // await Purchases.identify(userData.id);
  // await Purchases.setEmail(userData.email);
  // await Purchases.setAttributes({ userId: userData.id });
}

export async function invalidatePurchaserInfoCache() {
  // if (IS_SETUP) {
  //   await Purchases.invalidatePurchaserInfoCache();
  // }
}

export async function resetUser() {
  if (IS_SETUP) {
    await Purchases.reset();
  }
}

let _cachedPackages = null;

export async function getOfferings() {
  if (_cachedPackages) {
    return _cachedPackages;
  }

  let offerings = await Purchases.getOfferings();
  if (offerings && offerings.current) {
    let packages = offerings.current.availablePackages;
    let monthly = packages.find(
      p => p.packageType === Purchases.PACKAGE_TYPE.MONTHLY
    );

    if (!monthly) {
      alert('No subscription offerings available');
    } else {
      _cachedPackages = [monthly];
      return _cachedPackages;
    }
  } else {
    alert('No subscription offerings available');
  }

  return null;
}

export async function purchase(package_) {
  try {
    let { productIdentifier, purchaserInfo } = await Purchases.purchasePackage(
      package_
    );

    return {
      productId: productIdentifier,
      purchaser: purchaserInfo
    };
  } catch (e) {
    console.log(e);
    let desc = RCPurchasesErrorDescription(e.code);

    if (desc !== 'RCPurchaseCancelledError') {
      captureException(
        new Error(`Error purchasing subscription: ${e.code} ${desc}`)
      );

      switch (desc) {
        case 'RCProductNotAvailableForPurchaseError':
        case 'RCNetworkError':
          alert(
            'Unable to contact the server. Check your internet connection.'
          );
          break;
        case 'RCStoreProblemError':
          alert(
            'There was a problem connection to the store. Please try again'
          );
          break;
        case 'RCProductAlreadyPurchasedError':
          alert('This product has already been purchased');
          break;
        default:
          alert(
            'An error occurred processing your subscription. Please contact help@actualbudget.com for support.'
          );
      }
    }
  }

  return null;
}

export async function restore() {
  try {
    let purchaser = await Purchases.restoreTransactions();
    return purchaser;
  } catch (e) {
    let desc = RCPurchasesErrorDescription(e.code);

    captureException(
      new Error(`Error restoring subscription: ${e.code} ${desc}`)
    );

    switch (desc) {
      case 'RCReceiptAlreadyInUseError':
        alert(
          'The current subscription is in use by a different account. Please sign into your device with the correct account.'
        );
        break;
      case 'RCMissingReceiptFileError':
        alert(
          'Receipt missing. Make sure you are signed into the correct account on your device.'
        );
        break;
      case 'RCNetworkError':
        alert('Unable to contact the server. Check your internet connection.');
        break;
      default:
        alert(
          'An error occurred processing your subscription. Please contact help@actualbudget.com for support.'
        );
    }
  }

  return null;
}
