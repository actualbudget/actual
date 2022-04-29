#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(ACTInAppPurchase, RCTViewManager)

RCT_EXTERN_METHOD(listen)
RCT_EXTERN_METHOD(getReceiptString:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getProducts:(NSArray*)plan)
RCT_EXTERN_METHOD(buyProduct:(NSString*)plan)

@end
