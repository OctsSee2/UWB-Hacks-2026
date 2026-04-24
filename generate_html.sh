REACT_BUILD_PATH="$(pwd)/build"

HTML_FILE_NAME="index"
HTML_PAGE_TITLE="CarbonCart"
# REACT_ROOT_ID="root"
# NO_JS_FALLBACK_TEXT="Plz enable Javascript"

REACT_CDN="https://esm.sh/react@18"
REACT_JSX_RUNTIME_CDN="https://esm.sh/react@18/jsx-runtime"
REACT_DOM_CDN="https://esm.sh/react-dom@18/client"

TRASH_PATH=$(pwd)/trash

cd $REACT_BUILD_PATH

BUNDLE_PATH=$(find ./ -regex ^./js/bundle-.*\.js$)

if [ -z "$BUNDLE_PATH" ]; then
  echo "Bundle JS file was not found in $BUNDLE_LOOK_PATH"
else
  mv ./*.html $TRASH_PATH
  echo "<html><header><title>$HTML_PAGE_TITLE</title><script type='importmap'>{\"imports\":{\"react\":\"$REACT_CDN\",\"react/jsx-runtime\":\"$REACT_JSX_RUNTIME_CDN\",\"react-dom/client\":\"$REACT_DOM_CDN\"}}</script><script defer type='module' src='$BUNDLE_PATH'></script></header><body></body></html>" > "./$HTML_FILE_NAME.html"
#  echo "<html><header><title>$HTML_PAGE_TITLE</title><script type='importmap'>{\"imports\":{\"react\":\"$REACT_CDN\",\"react/jsx-runtime\":\"$REACT_JSX_RUNTIME_CDN\",\"react-dom/client\":\"$REACT_DOM_CDN\"}}</script><script defer type='module' src='$BUNDLE_PATH'></script></header><body><div id='$REACT_ROOT_ID'>$NO_JS_FALLBACK_TEXT</body></html>" > "./$HTML_FILE_NAME.html"
fi
