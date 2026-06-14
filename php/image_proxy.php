<?php
if (isset($_GET['url']) && !empty($_GET['url'])) {
    $queryString = $_SERVER['QUERY_STRING'];
    $imageUrl = $_GET['url'];

    if (strpos($imageUrl, 'media.misskeyusercontent.jp/io/') !== false) {
        $imageUrl = str_replace(
            'media.misskeyusercontent.jp/io/',
            'media.misskeyusercontent.jp%2Fio%2F',
            $imageUrl
        );
    }

    if (filter_var($imageUrl, FILTER_VALIDATE_URL) && parse_url($imageUrl, PHP_URL_SCHEME) === 'https') {
        
        $imageData = fetchImageSecure($imageUrl);

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
                echo "Unsupported image type: " . htmlspecialchars($mimeType, ENT_QUOTES, 'UTF-8');
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

function fetchImageSecure($url, $maxRedirects = 3) {
    if ($maxRedirects < 0) {
        return false;
    }

    $host = parse_url($url, PHP_URL_HOST);
    if (!$host) {
        return false;
    }

    $ips = gethostbynamel($host);
    if (!$ips) {
        if (in_array(strtolower($host), ['localhost', '127.0.0.1', '0.0.0.0'])) {
            return false;
        }
    } else {
        foreach ($ips as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return false;
            }
        }
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false); // 手動リダイレクト追跡
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($httpCode == 301 || $httpCode == 302 || $httpCode == 307 || $httpCode == 308) {
        $redirectUrl = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
        curl_close($ch);

        if ($redirectUrl) {
            return fetchImageSecure($redirectUrl, $maxRedirects - 1);
        }
        return false;
    }

    curl_close($ch);

    if ($httpCode !== 200) {
        return false;
    }

    return $data;
}
