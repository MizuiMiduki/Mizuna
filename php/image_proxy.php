<?php
if (isset($_GET['url']) && !empty($_GET['url'])) {
    $imageUrl = $_GET['url'];

    if (filter_var($imageUrl, FILTER_VALIDATE_URL) && parse_url($imageUrl, PHP_URL_SCHEME) === 'https') {
        $finalUrl = getFinalUrl($imageUrl);

        $imageData = fetchImageWithReferrer($finalUrl);
        if ($imageData !== false) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->buffer($imageData);

            if (in_array($mimeType, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
                header('Content-Type: ' . $mimeType);
                echo $imageData;
                exit;
            } else {
                header("HTTP/1.1 400 Bad Request");
                echo "Unsupported image type.";
                exit;
            }
        }
    }
    header("HTTP/1.1 500 Internal Server Error");
    echo "Failed to fetch the image or the file is too large.";
} else {
    header("HTTP/1.1 400 Bad Request");
    echo "Image URL parameter is missing.";
}

function getFinalUrl($url) {
    $headers = @get_headers($url, 1);
    if ($headers && isset($headers['Location'])) {
        return is_array($headers['Location']) ? end($headers['Location']) : $headers['Location'];
    }
    return $url;
}

function fetchImageWithReferrer($url) {
    $referrer = getReferrer(); // リファラーを取得
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer: ' . $referrer, // 自動生成したリファラーを設定
        'Connection: keep-alive'
    ]);
    curl_setopt($ch, CURLOPT_VERBOSE, false);
    $data = curl_exec($ch);

    if (curl_errno($ch)) {
        echo 'cURL Error: ' . curl_error($ch);
    }

    curl_close($ch);
    return $data;
}

function getReferrer() {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST']; // サーバーのホスト名
    $script = dirname($_SERVER['SCRIPT_NAME']); // 現在のスクリプトのパス
    return $protocol . $host . $script; // 完全なURLをリファラーとして返す
}
