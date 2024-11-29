<?php
if (isset($_GET['url']) && !empty($_GET['url'])) {
    // 二重エンコードされたURLのデコード
    $imageUrl = urldecode($_GET['url']);
    
    // URLの再度デコードが必要かチェック
    if (strpos($imageUrl, '%') !== false) {
        $imageUrl = urldecode($imageUrl);
    }

    // URLの検証
    if (filter_var($imageUrl, FILTER_VALIDATE_URL) && parse_url($imageUrl, PHP_URL_SCHEME) === 'https') {
        $imageData = fetchImage($imageUrl);

        if ($imageData !== false) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->buffer($imageData);

            // サポートされているMIMEタイプ
            $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

            if (in_array($mimeType, $allowedMimeTypes)) {
                header('Content-Type: ' . $mimeType);
                echo $imageData;
                exit;
            } else {
                header("HTTP/1.1 400 Bad Request");
                echo "Unsupported image type: $mimeType";
                exit;
            }
        }
    }
    header("HTTP/1.1 500 Internal Server Error");
    echo "Failed to fetch the image.";
} else {
    header("HTTP/1.1 400 Bad Request");
    echo "Image URL parameter is missing.";
}

function fetchImage($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $data = curl_exec($ch);

    if (curl_errno($ch)) {
        curl_close($ch);
        return false;
    }
    curl_close($ch);
    return $data;
}
