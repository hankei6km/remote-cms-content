#!/bin/sh

OUT="src/types/mapconfigSchema.ts"

# 「編集しないで」コメントを付けることと、
# esm 環境でソース(PATH が解決できる状態)として json を読み込むのは難しいので
# .ts にしている.
# (import.meta を使う方法は jest でハマった)
cat > "${OUT}" <<EOF
// Code generated by scripts/mapconfig-schema-build.sh; DO NOT EDIT.

export const mapconfigSchema =
EOF

# --defaultProps : ajv  ではエラー(設定によっては回避できるかもだが、試していない)
#                  Error: strict mode: unknown keyword: "defaultProperties"
# --noExtraProps : 定義されてないフィールドが使われたらエラーにするため.
# --required     : 定義されているフィールドが使われていなかったらエラーにするため.
npx typescript-json-schema --noExtraProps --required \
    --include src/types/map.ts \
         -- ./tsconfig.json MapConfig >> "${OUT}"
