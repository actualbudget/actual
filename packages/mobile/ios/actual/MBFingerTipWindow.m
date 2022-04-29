//
//  MBFingerTipWindow.m
//
//  Copyright 2011-2017 Mapbox, Inc. All rights reserved.
//

#import "MBFingerTipWindow.h"

// This file must be built with ARC.
//
#if !__has_feature(objc_arc)
    #error "ARC must be enabled for MBFingerTipWindow.m"
#endif

@interface MBFingerTipView : UIImageView

@property (nonatomic, assign) NSTimeInterval timestamp;
@property (nonatomic, assign) BOOL shouldAutomaticallyRemoveAfterTimeout;
@property (nonatomic, assign, getter=isFadingOut) BOOL fadingOut;

@end

#pragma mark -

@interface MBFingerTipOverlayWindow : UIWindow
@end

#pragma mark -

@interface MBFingerTipWindow ()

@property (nonatomic, strong) UIWindow *overlayWindow;
@property (nonatomic, assign) BOOL active;
@property (nonatomic, assign) BOOL fingerTipRemovalScheduled;

- (void)MBFingerTipWindow_commonInit;
- (BOOL)anyScreenIsMirrored;
- (void)updateFingertipsAreActive;
- (void)scheduleFingerTipRemoval;
- (void)cancelScheduledFingerTipRemoval;
- (void)removeInactiveFingerTips;
- (void)removeFingerTipWithHash:(NSUInteger)hash animated:(BOOL)animated;
- (BOOL)shouldAutomaticallyRemoveFingerTipForTouch:(UITouch *)touch;

@end

#pragma mark -

@implementation MBFingerTipWindow

@synthesize touchImage=_touchImage;

- (id)initWithCoder:(NSCoder *)decoder
{
    // This covers NIB-loaded windows.
    //
    self = [super initWithCoder:decoder];

    if (self != nil)
        [self MBFingerTipWindow_commonInit];
    
    return self;
}

- (id)initWithFrame:(CGRect)rect
{
    // This covers programmatically-created windows.
    //
    self = [super initWithFrame:rect];
    
    if (self != nil)
        [self MBFingerTipWindow_commonInit];
    
    return self;
}

- (void)MBFingerTipWindow_commonInit
{
    self.strokeColor = [UIColor blackColor];
    self.fillColor = [UIColor whiteColor];
    
    self.touchAlpha   = 0.5;
    self.fadeDuration = 0.3;
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(screenConnect:)
                                                 name:UIScreenDidConnectNotification
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(screenDisconnect:)
                                                 name:UIScreenDidDisconnectNotification
                                               object:nil];

    // Set up active now, in case the screen was present before the window was created (or application launched).
    //
    [self updateFingertipsAreActive];
}

- (void)dealloc
{
    [[NSNotificationCenter defaultCenter] removeObserver:self name:UIScreenDidConnectNotification    object:nil];
    [[NSNotificationCenter defaultCenter] removeObserver:self name:UIScreenDidDisconnectNotification object:nil];
}

#pragma mark -

- (UIWindow *)overlayWindow
{
    if ( ! _overlayWindow)
    {
        _overlayWindow = [[MBFingerTipOverlayWindow alloc] initWithFrame:self.frame];
        
        _overlayWindow.userInteractionEnabled = NO;
        _overlayWindow.windowLevel = UIWindowLevelStatusBar;
        _overlayWindow.backgroundColor = [UIColor clearColor];
        _overlayWindow.hidden = NO;
    }
    
    return _overlayWindow;
}

- (UIImage *)touchImage
{
    if ( ! _touchImage)
    {
        UIBezierPath *clipPath = [UIBezierPath bezierPathWithRect:CGRectMake(0, 0, 50.0, 50.0)];
        
        UIGraphicsBeginImageContextWithOptions(clipPath.bounds.size, NO, 0);

        UIBezierPath *drawPath = [UIBezierPath bezierPathWithArcCenter:CGPointMake(25.0, 25.0) 
                                                                radius:22.0
                                                            startAngle:0
                                                              endAngle:2 * M_PI
                                                             clockwise:YES];

        drawPath.lineWidth = 2.0;
        
        [self.strokeColor setStroke];
        [self.fillColor setFill];

        [drawPath stroke];
        [drawPath fill];
        
        [clipPath addClip];
        
        _touchImage = UIGraphicsGetImageFromCurrentImageContext();
        
        UIGraphicsEndImageContext();
    }
        
    return _touchImage;
}

#pragma mark - Setter

- (void)setAlwaysShowTouches:(BOOL)flag
{
	if (_alwaysShowTouches != flag)
	{
		_alwaysShowTouches = flag;

        [self updateFingertipsAreActive];
	}
}

#pragma mark -
#pragma mark Screen notifications

- (void)screenConnect:(NSNotification *)notification
{
    [self updateFingertipsAreActive];
}

- (void)screenDisconnect:(NSNotification *)notification
{
    [self updateFingertipsAreActive];
}

- (BOOL)anyScreenIsMirrored
{
    if ( ! [UIScreen instancesRespondToSelector:@selector(mirroredScreen)])
        return NO;

    for (UIScreen *screen in [UIScreen screens])
    {
        if ([screen mirroredScreen] != nil)
            return YES;
    }

    return NO;
}

- (void)updateFingertipsAreActive;
{
    if (self.alwaysShowTouches || ([[[[NSProcessInfo processInfo] environment] objectForKey:@"DEBUG_FINGERTIP_WINDOW"] boolValue]))
    {
        self.active = YES;
    }
    else
    {
        self.active = [self anyScreenIsMirrored];
    }
}

#pragma mark -
#pragma mark UIWindow overrides

- (void)sendEvent:(UIEvent *)event
{
    if (self.active)
    {
        NSSet *allTouches = [event allTouches];
        
        for (UITouch *touch in [allTouches allObjects])
        {
            switch (touch.phase)
            {
                case UITouchPhaseBegan:
                case UITouchPhaseMoved:
                case UITouchPhaseStationary:
                {
                    MBFingerTipView *touchView = (MBFingerTipView *)[self.overlayWindow viewWithTag:touch.hash];

                    if (touch.phase != UITouchPhaseStationary && touchView != nil && [touchView isFadingOut])
                    {
                        [touchView removeFromSuperview];
                        touchView = nil;
                    }
                    
                    if (touchView == nil && touch.phase != UITouchPhaseStationary)
                    {
                        touchView = [[MBFingerTipView alloc] initWithImage:self.touchImage];
                        [self.overlayWindow addSubview:touchView];
                    }
            
                    if ( ! [touchView isFadingOut])
                    {
                        touchView.alpha = self.touchAlpha;
                        touchView.center = [touch locationInView:self.overlayWindow];
                        touchView.tag = touch.hash;
                        touchView.timestamp = touch.timestamp;
                        touchView.shouldAutomaticallyRemoveAfterTimeout = [self shouldAutomaticallyRemoveFingerTipForTouch:touch];
                    }
                    break;
                }

                case UITouchPhaseEnded:
                case UITouchPhaseCancelled:
                {
                    [self removeFingerTipWithHash:touch.hash animated:YES];
                    break;
                }
            }
        }
    }
        
    [super sendEvent:event];

    [self scheduleFingerTipRemoval]; // We may not see all UITouchPhaseEnded/UITouchPhaseCancelled events.
}

#pragma mark -
#pragma mark Private

- (void)scheduleFingerTipRemoval
{
    if (self.fingerTipRemovalScheduled)
        return;
    
    self.fingerTipRemovalScheduled = YES;
    [self performSelector:@selector(removeInactiveFingerTips) withObject:nil afterDelay:0.1];
}

- (void)cancelScheduledFingerTipRemoval
{
    self.fingerTipRemovalScheduled = YES;
    [NSObject cancelPreviousPerformRequestsWithTarget:self selector:@selector(removeInactiveFingerTips) object:nil];
}

- (void)removeInactiveFingerTips
{
    self.fingerTipRemovalScheduled = NO;

    NSTimeInterval now = [[NSProcessInfo processInfo] systemUptime];
    const CGFloat REMOVAL_DELAY = 0.2;

    for (MBFingerTipView *touchView in [self.overlayWindow subviews])
    {
        if ( ! [touchView isKindOfClass:[MBFingerTipView class]])
            continue;
        
        if (touchView.shouldAutomaticallyRemoveAfterTimeout && now > touchView.timestamp + REMOVAL_DELAY)
            [self removeFingerTipWithHash:touchView.tag animated:YES];
    }

    if ([[self.overlayWindow subviews] count] > 0)
        [self scheduleFingerTipRemoval];
}

- (void)removeFingerTipWithHash:(NSUInteger)hash animated:(BOOL)animated;
{
    MBFingerTipView *touchView = (MBFingerTipView *)[self.overlayWindow viewWithTag:hash];
    if ( ! [touchView isKindOfClass:[MBFingerTipView class]])
        return;
    
    if ([touchView isFadingOut])
        return;
        
    BOOL animationsWereEnabled = [UIView areAnimationsEnabled];

    if (animated)
    {
        [UIView setAnimationsEnabled:YES];
        [UIView beginAnimations:nil context:nil];
        [UIView setAnimationDuration:self.fadeDuration];
    }

    touchView.frame = CGRectMake(touchView.center.x - touchView.frame.size.width, 
                                 touchView.center.y - touchView.frame.size.height, 
                                 touchView.frame.size.width  * 2, 
                                 touchView.frame.size.height * 2);
    
    touchView.alpha = 0.0;

    if (animated)
    {
        [UIView commitAnimations];
        [UIView setAnimationsEnabled:animationsWereEnabled];
    }
    
    touchView.fadingOut = YES;
    [touchView performSelector:@selector(removeFromSuperview) withObject:nil afterDelay:self.fadeDuration];
}

- (BOOL)shouldAutomaticallyRemoveFingerTipForTouch:(UITouch *)touch;
{
    // We don't reliably get UITouchPhaseEnded or UITouchPhaseCancelled
    // events via -sendEvent: for certain touch events. Known cases
    // include swipe-to-delete on a table view row, and tap-to-cancel
    // swipe to delete. We automatically remove their associated
    // fingertips after a suitable timeout.
    //
    // It would be much nicer if we could remove all touch events after
    // a suitable time out, but then we'll prematurely remove touch and
    // hold events that are picked up by gesture recognizers (since we
    // don't use UITouchPhaseStationary touches for those. *sigh*). So we
    // end up with this more complicated setup.

    UIView *view = [touch view];
    view = [view hitTest:[touch locationInView:view] withEvent:nil];

    while (view != nil)
    {
        if ([view isKindOfClass:[UITableViewCell class]])
        {
            for (UIGestureRecognizer *recognizer in [touch gestureRecognizers])
            {
                if ([recognizer isKindOfClass:[UISwipeGestureRecognizer class]])
                    return YES;
            }
        }

        if ([view isKindOfClass:[UITableView class]])
        {
            if ([[touch gestureRecognizers] count] == 0)
                return YES;
        }

        view = view.superview;
    }

    return NO;
}

@end

#pragma mark -

@implementation MBFingerTipView

@end

#pragma mark -

@implementation MBFingerTipOverlayWindow

// UIKit tries to get the rootViewController from the overlay window. Use the Fingertips window instead. This fixes
// issues with status bar behavior, as otherwise the overlay window would control the status bar.

- (UIViewController *)rootViewController
{
    NSPredicate *predicate = [NSPredicate predicateWithBlock:^BOOL(id evaluatedObject, NSDictionary *bindings)
    {
        return [evaluatedObject isKindOfClass:[MBFingerTipWindow class]];
    }];
    UIWindow *mainWindow = [[[[UIApplication sharedApplication] windows] filteredArrayUsingPredicate:predicate] firstObject];
    return mainWindow.rootViewController ?: [super rootViewController];
}

@end
