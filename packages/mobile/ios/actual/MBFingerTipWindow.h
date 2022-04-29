//
//  MBFingerTipWindow.h
//
//  Copyright 2011-2017 Mapbox, Inc. All rights reserved.
//

#import <UIKit/UIKit.h>

/** A MBFingerTipWindow gives you automatic presentation mode in your iOS app. Note that currently, this is only designed for the iPad 2 and iPhone 4S (or later), which feature hardware video mirroring support. This library does not do the mirroring for you!
*
*   Use MBFingerTipWindow in place of UIWindow and your app will automatically determine when an external screen is available. It will show every touch on-screen with a nice partially-transparent graphic that automatically fades out when the touch ends. */
@interface MBFingerTipWindow : UIWindow

/** A custom image to use to show touches on screen. If unset, defaults to a partially-transparent stroked circle. */
@property (nonatomic, strong) UIImage *touchImage;

/** The alpha transparency value to use for the touch image. Defaults to 0.5. */
@property (nonatomic, assign) CGFloat touchAlpha;

/** The time over which to fade out touch images. Defaults to 0.3. */
@property (nonatomic, assign) NSTimeInterval fadeDuration;

/** If using the default touchImage, the color with which to stroke the shape. Defaults to black. */
@property (nonatomic, strong) UIColor *strokeColor;

/** If using the default touchImage, the color with which to fill the shape. Defaults to white. */
@property (nonatomic, strong) UIColor *fillColor;

/** Sets whether touches should always show regardless of whether the display is mirroring. Defaults to NO. */
@property (nonatomic, assign) BOOL alwaysShowTouches;

@end
