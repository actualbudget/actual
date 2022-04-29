#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(ACTKeyboardAvoiding, RCTViewManager)

RCT_EXTERN_METHOD(activate:(int)scrollViewHandle)
RCT_EXTERN_METHOD(deactivate:(int)scrollViewHandle)
RCT_EXTERN_METHOD(enable)
RCT_EXTERN_METHOD(disable)

@end
