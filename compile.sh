TRASH_PATH=$(pwd)/trash

mv ./build/*.* $TRASH_PATH
# mv ./build/js/* $TRASH_PATH
npx esbuild ./src/index.tsx --format=esm --packages=external --jsx=automatic --bundle --alias:@shared=$(pwd)/shared --outbase="./src" --outfile="./build/bundle.js" # --entry-names="[name]-[hash]"

# ./generate_html.sh
