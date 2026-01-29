#!/bin/bash
# https://code.claude.com/docs/ja/statusline

# stdinからJSON入力を読み込む
input=$(cat)

# ヘルパー関数
get_json_value() {
    echo "$input" | jq -r "$1" 2>/dev/null
}

# 基本情報を抽出
MODEL_DISPLAY=$(get_json_value '.model.display_name')
CURRENT_DIR=$(get_json_value '.workspace.current_dir')
PROJECT_DIR=$(get_json_value '.workspace.project_dir')
DIR_NAME="${CURRENT_DIR##*/}"
PROJECT_NAME="${PROJECT_DIR##*/}"

# バージョン情報
VERSION=$(get_json_value '.version')

# セッションID情報（フルで表示）
SESSION_ID=$(get_json_value '.session_id')
SESSION_FULL=""
if [ "$SESSION_ID" != "null" ] && [ -n "$SESSION_ID" ]; then
    SESSION_FULL="${SESSION_ID}"
fi

# gitリポジトリにいる場合はgitブランチとステータスを表示
BRANCH_INFO=""
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
    if [ -n "$BRANCH" ]; then
        # git状態をチェック（変更があるか）
        if git diff-index --quiet HEAD -- 2>/dev/null; then
            GIT_STATUS=""  # クリーン
        else
            GIT_STATUS="*"  # 変更あり
        fi
        BRANCH_INFO="\033[36m${BRANCH}${GIT_STATUS}\033[0m"
    fi
fi

# 1行目: version: ${version} model: ${model} id: ${session_id}
LINE1="version: \033[90mv${VERSION}\033[0m model: \033[1m${MODEL_DISPLAY}\033[0m id: \033[90m${SESSION_FULL}\033[0m"

# 2行目: branch: ${branch} | ${project_dir} -> ${current_dir}
LINE2="branch: ${BRANCH_INFO} | ${PROJECT_NAME} -> ${DIR_NAME}"

# 2行で出力
echo -e "${LINE1}\n${LINE2}"
