
@objc(ACTScrollViewManager)
class ACTScrollViewManager : RCTEventEmitter, UIScrollViewDelegate {
    private var scrollView: RCTScrollView?
    private var hasListened: Bool = false
    private var focusedView: RCTView?

    @objc override func supportedEvents() -> [String] {
        return []
    }
    
    @objc func activate(_ scrollViewHandle: Int) {
        DispatchQueue.main.async {
            self.scrollView = self.bridge.uiManager.view(forReactTag: scrollViewHandle as NSNumber) as? RCTScrollView

            if(!self.hasListened) {
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

                self.hasListened = true
            }
        }
    }

    @objc func deactivate() {
        self.scrollView = nil
    }

    @objc func setFocused(_ viewHandle: Int) {
        DispatchQueue.main.async {
            if viewHandle == -1 {
                self.focusedView = nil
            }
            else {
                self.focusedView = self.bridge.uiManager.view(forReactTag: viewHandle as NSNumber) as? RCTView
                self.makeFocusedViewVisible()
            }
        }
    }

    @objc func setInsetBottom(_ bottom: Float) {
        if let scrollView = scrollView {
            scrollView.contentInset = UIEdgeInsets.init(
              top: scrollView.contentInset.top,
              left: scrollView.contentInset.left,
              bottom: CGFloat(bottom),
              right: scrollView.contentInset.right
            )
        }
    }

  @objc func handleKeyboardNotification(_ notification: NSNotification) {
        // The keyboard has either opened or closed. We need to update
        // the content inset so the user can still scroll all the way
        // to bottom and not hide anything behind the keyboard

        let begin = (notification.userInfo?[UIResponder.keyboardFrameBeginUserInfoKey] as! NSValue).cgRectValue
        let end = (notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as! NSValue).cgRectValue
        let curve = (notification.userInfo?[UIResponder.keyboardAnimationCurveUserInfoKey] as? NSNumber)?.uintValue
        let duration = (notification.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?.doubleValue

        let keyboardHeight = UIScreen.main.bounds.height - end.origin.y

        if let scrollView = self.scrollView {
            // The scroll view may not be hitting the bottom of the
            // screen. Need to calculate the area which the keyboard
            // is covering
            let bottom = scrollView.convert(CGPoint(x: 0, y: scrollView.bounds.height), to:nil)
            let margin = UIScreen.main.bounds.size.height - bottom.y;

            let inset = max(0, keyboardHeight - margin)
            self.setInsetBottom(Float(inset))

            if(notification.name == UIResponder.keyboardWillHideNotification) {
                // If the keyboard is closing, make sure the scoll content is
                // flush with the new bottom
                // self.flushifyBottom()
            }

            self.makeFocusedViewVisible()
        }
    }

    func makeFocusedViewVisible() {
        if let view = focusedView, let scrollView = self.scrollView {
            let rect = scrollView.scrollView.convert(view.frame, from: view)
            scrollView.scrollView.scrollRectToVisible(rect, animated: true)
        }
    }

    func flushifyBottom() {
        // If something below the scroll view has closed and
        // exposed a "bare" area of the scroll view (blank space
        // past the items), make sure to update the content offset
        // to scroll it down. Simple shrinking the bottom content
        // inset does not automatically "pull" the content down

        if let scrollView = self.scrollView {
            let viewableScrollArea = scrollView.bounds.height - scrollView.contentInset.bottom
            let contentHeight = scrollView.contentSize.height
            let contentOffset = scrollView.scrollView.contentOffset.y

            if(viewableScrollArea > contentHeight - contentOffset) {
                let scrollTo = max(scrollView.contentSize.height - scrollView.bounds.height, 0)
                scrollView.scrollView.setContentOffset(CGPoint(x: 0, y: scrollTo), animated: true)
            }
        }
    }

    deinit {
        // TODO: Remove observer
    }
}
