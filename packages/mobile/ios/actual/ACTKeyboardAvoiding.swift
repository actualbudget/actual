
@objc(ACTKeyboardAvoiding)
class ACTKeyboardAvoiding : RCTEventEmitter {
    private var scrollViewHandles: [Int] = []
    private var activeField: UIView?
    private var debugView: UIView
    private var disabled = false

    @objc override func supportedEvents() -> [String] {
        return []
    }

    override init() {
        debugView = UIView()
        super.init()

        // Listen for active inputs
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(self.handleTextDidBeginEditing),
          name: UITextField.textDidBeginEditingNotification,
          object: nil
        );
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(self.handleTextDidEndEditing),
          name: UITextField.textDidEndEditingNotification,
          object: nil
        );

        // Listen for the keyboard opening/closing
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(self.handleKeyboardNotification),
          name: UIResponder.keyboardWillShowNotification,
          object: nil
        );
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(self.handleKeyboardNotification),
          name: UIResponder.keyboardWillHideNotification,
          object: nil
        );
    }

    func getCurrentScrollView() -> RCTScrollView? {
        if let handle = scrollViewHandles.last {
            return self.bridge.uiManager.view(forReactTag: handle as NSNumber) as? RCTScrollView
        }
        return nil
    }

    @objc func activate(_ scrollViewHandle: Int) {
        self.scrollViewHandles.append(scrollViewHandle)
    }

    @objc func deactivate(_ scrollViewHandle: Int) {
        if let handle = scrollViewHandles.last {
            if handle != scrollViewHandle {
                fatalError("Deactivated scroll view passed invalid handle")
            }

            scrollViewHandles.removeLast()
        }
        else {
            fatalError("Deactivated scroll view when none exist")
        }
    }

    @objc func enable() {
        disabled = false
    }

    @objc func disable() {
        disabled = true
    }

    @objc func handleTextDidBeginEditing(_ notification: NSNotification) {
        if let field = notification.object as? UITextField {
            activeField = field

            // A bit of a hack, but walk up 15 elements and try to
            // find a parent view that we should use as the frame with
            // which to calculcate scrolling positions. This allows
            // the user to construct arbitrary scrolling positions
            // without worrying about the size of the input itself
            var currentView: UIView = field
            for i in 1...45 {
                if let superview = currentView.superview {
                    currentView = superview
                    if currentView.accessibilityIdentifier == "scroll-to-boundary" {
                        activeField = currentView
                    }
                }
            }
        }
        else {
            activeField = nil
        }
    }

  @objc func handleTextDidEndEditing(_ notification: NSNotification) {
        activeField = nil
    }

  @objc func handleKeyboardNotification(_ notification: NSNotification) {
        // The keyboard has either opened or closed. We need to update
        // the content inset so the user can still scroll all the way
        // to bottom and not hide anything behind the keyboard

        if(disabled) {
            return;
        }

    let begin = (notification.userInfo?[UIResponder.keyboardFrameBeginUserInfoKey] as! NSValue).cgRectValue
    let end = (notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as! NSValue).cgRectValue
    let curve = (notification.userInfo?[UIResponder.keyboardAnimationCurveUserInfoKey] as? NSNumber)?.uintValue
    let duration = (notification.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?.doubleValue

        let keyboardHeight = UIScreen.main.bounds.height - end.origin.y

        if let scrollView = self.getCurrentScrollView() {
            let bottomPoint = scrollView.convert(CGPoint(x: 0, y: scrollView.bounds.height), to: nil)
            let margin = UIScreen.main.bounds.height - bottomPoint.y;
            
            // The scroll view probably isn't flush to the bottom of
            // the screen, so ignore a "margin" which is given to us
            // from the JS side
            let inset = max(0, keyboardHeight - margin + 10)
            scrollView.contentInset = UIEdgeInsets.init(
              top: scrollView.contentInset.top,
              left: scrollView.contentInset.left,
              bottom: inset,
              right: scrollView.contentInset.right
            )

            if(notification.name == UIResponder.keyboardWillHideNotification) {
                // If the keyboard is closing, make sure the scoll content is
                // flush with the new bottom
                self.flushifyBottom()
            }

            if let activeField = self.activeField, let superview = activeField.superview {
               let rect = superview.convert(activeField.frame, to: scrollView.scrollView)

               // debugView.frame = rect
               // debugView.backgroundColor = UIColor.red
               // debugView.removeFromSuperview()
               // scrollView.scrollView.addSubview(debugView)

               scrollView.scrollView.scrollRectToVisible(rect, animated: true)
           }
        }
    }

    func flushifyBottom() {
        // If something below the scroll view has closed and
        // exposed a "bare" area of the scroll view (blank space
        // past the items), make sure to update the content offset
        // to scroll it down. Simple shrinking the bottom content
        // inset does not automatically "pull" the content down

        if let scrollView = self.getCurrentScrollView() {
            let viewableScrollArea = scrollView.bounds.height - scrollView.contentInset.bottom
            let contentHeight = scrollView.contentSize.height
            let contentOffset = scrollView.scrollView.contentOffset.y

            if(viewableScrollArea > contentHeight - contentOffset) {
                let scrollTo = max(scrollView.contentSize.height - scrollView.bounds.height, 0)
                scrollView.scrollView.setContentOffset(CGPoint(x: 0, y: scrollTo), animated: true)
            }
        }
    }
}
