import StoreKit

@objc(ACTInAppPurchase)
class ACTInAppPurchase : RCTEventEmitter {
    public var productsReq: SKProductsRequest?
    public var products: [SKProduct] = []

    deinit {
        SKPaymentQueue.default().remove(self)
    }
    
    @objc override func supportedEvents() -> [String] {
        return ["ProductsAvailable", "PaymentComplete", "PaymentFailed", "ReceiptRefreshed"]
    }

    @objc func listen() {
        // The reason we don't do this in init is because the backend
        // thread also loads modules and we don't want it listening
        // here. This is called when the app loads in
        // `didFinishLaunchingWithOptions`
        SKPaymentQueue.default().add(self)
    }

    @objc func getProducts(_ productIds: [String]) {
        products = []
        productsReq?.cancel()

        productsReq = SKProductsRequest(productIdentifiers: Set(productIds))
        productsReq!.delegate = self
        productsReq!.start()
    }

    @objc func buyProduct(_ productId: String) {
        if let product = products.first(where: { $0.productIdentifier == productId }) {
            let payment = SKPayment(product: product)
            SKPaymentQueue.default().add(payment)
        }
    }

    @objc func getReceiptString(_ callback: RCTResponseSenderBlock) {
        callback([NSNull(), self._getReceiptString() as Any])
    }


    func _getReceiptString() -> String? {
        guard let receiptPath = Bundle.main.appStoreReceiptURL else {
            return nil
        }

        var receiptData : Data;
        do {
            receiptData = try Data(contentsOf: receiptPath, options: .alwaysMapped)
        }
        catch {
            return nil
        }
        
        return receiptData.base64EncodedString(options: [])
    }
}

extension ACTInAppPurchase: SKProductsRequestDelegate {
  public func productsRequest(_ request: SKProductsRequest, didReceive response: SKProductsResponse) {
    let products = response.products
    productsReq = nil

    self.products = products

    let ret : [String:AnyObject] = [
      "productIds": products.map({ $0.productIdentifier }) as AnyObject
    ]
    self.sendEvent(withName: "ProductsAvailable", body: ret)
  }
  
  public func request(_ request: SKRequest, didFailWithError error: Error) {
    print("Failed to load list of products.")
    print("Error: \(error.localizedDescription)")

    productsReq = nil
  }
}

extension ACTInAppPurchase: SKPaymentTransactionObserver {
  public func paymentQueue(_ queue: SKPaymentQueue, 
                           updatedTransactions transactions: [SKPaymentTransaction]) {
    for transaction in transactions {
      switch transaction.transactionState {
      case .purchased:
        print("Updated transaction \(transaction) purchased")
        complete(transaction: transaction)
        break
      case .failed:
        print("Updated transaction \(transaction) failed")
        fail(transaction: transaction)
        break
      case .restored:
        print("Updated transaction \(transaction) restored")
        restore(transaction: transaction)
        break
      case .deferred:
        print("Updated transaction \(transaction) deferred")
        break
      case .purchasing:
        print("Updated transaction \(transaction) purchasing") 
       break
      }
    }
  }
 
  private func complete(transaction: SKPaymentTransaction) {
    guard let receiptString = _getReceiptString() else {
      return 
    }

    let ret : [String:AnyObject] = [
      "productIdentifier": transaction.payment.productIdentifier as AnyObject,
      "receipt": receiptString as AnyObject
    ]
    
    self.sendEvent(withName: "PaymentComplete", body: ret)

    SKPaymentQueue.default().finishTransaction(transaction)
  }
 
  private func restore(transaction: SKPaymentTransaction) {
    guard let productIdentifier = transaction.original?.payment.productIdentifier else { return }
 
    let ret : [String:AnyObject] = [
      "productIdentifier": productIdentifier as AnyObject
    ]
    self.sendEvent(withName: "PaymentRestore", body: ret)

    SKPaymentQueue.default().finishTransaction(transaction)
  }
 
  private func fail(transaction: SKPaymentTransaction) {
    if let transactionError = transaction.error as NSError?,
       let localizedDescription = transaction.error?.localizedDescription,
       transactionError.code != SKError.paymentCancelled.rawValue {
        print("Transaction Error: \(localizedDescription)")
    }

    let ret : [String:AnyObject] = [:]
    self.sendEvent(withName: "PaymentFailed", body: ret)

    SKPaymentQueue.default().finishTransaction(transaction)
  }
}
