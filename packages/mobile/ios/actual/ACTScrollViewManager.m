#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(ACTScrollViewManager, RCTViewManager)

RCT_EXTERN_METHOD(activate:(int)scrollViewHandle)
RCT_EXTERN_METHOD(deactivate)
RCT_EXTERN_METHOD(setFocused:(int)viewHandle)
RCT_EXTERN_METHOD(setMarginHeight:(float)marginHeight)
RCT_EXTERN_METHOD(setInsetBottom:(float)bottom)
RCT_EXTERN_METHOD(flushifyBottom)

@end
