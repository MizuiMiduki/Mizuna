$(function () {
    document.getElementById("get_account").addEventListener('click', () => {
        // Mizunaをホストしているページのホスト名
        var Mizuna_host_address = location.hostname
        // アカウント情報を取得するMisskeyサーバーのアドレス
        var address = "misskey.io";
        // セッションID
        var session_ID = crypto.randomUUID();
        add_account(address, session_ID, Mizuna_host_address)
    });


    document.getElementById("get_data").addEventListener('click', () => {
        // アカウント情報を取得するMisskeyサーバーのアドレス
        var address = "misskey.io";
        // セッションIDを取得
        session_ID = location.search.replace("?session=", "")
        // サーバーからデータを取得
        let data = get_account_data(address, session_ID)
        let get_user_data = JSON.parse(data)

                // テスト用
                get_user_data = {
                    "ok": true,
                    "token": Math.random(),
                    "user": {
                        "id": "9aarim2jy5",
                        "name": "瑞井 箕月",
                        "username": "Mizui_Miduki",
                        "host": null,
                        "avatarUrl": "https://proxy.misskeyusercontent.com/avatar.webp?url=https%3A%2F%2Fs3.arkjp.net%2Fmisskey%2F0aae340e-d923-4e3b-8664-2eb019502696.jpg&avatar=1",
                        "avatarBlurhash": "efKnPo%4-DRk?H-aI.NEIobD9bn,xrxtRjV}oNt5bEj]xcWFNFWAof",
                        "avatarDecorations": [
                            {
                                "id": "9m9q4c61alzk0btm",
                                "url": "https://media.misskeyusercontent.com/io/7f797e40-9ab0-4f3b-b4c6-9d1103d637f2.png"
                            }
                        ],
                        "isBot": false,
                        "isCat": true,
                        "emojis": {},
                        "onlineStatus": "online",
                        "badgeRoles": [],
                        "url": null,
                        "uri": null,
                        "movedTo": null,
                        "alsoKnownAs": null,
                        "createdAt": "2023-01-22T09:49:40.027Z",
                        "updatedAt": "2024-02-08T12:05:22.310Z",
                        "lastFetchedAt": null,
                        "bannerUrl": "https://media.misskeyusercontent.com/io/bca75db5-4abc-4fa7-ad68-b1cefccf8b32.webp",
                        "bannerBlurhash": "eXDmN{S6n#t8tR.TR.Wrf+og.9Rlj^WWaxtSRjadazj]ozRkRjayof",
                        "isLocked": false,
                        "isSilenced": false,
                        "isLimited": false,
                        "isSuspended": false,
                        "description": "同人サークル @BlossomsArchive で代表をしながらゲーム作ったりウェブサイト作ったり本作ったりニコニコで動画配信したりしてます。",
                        "location": "北海道 札幌",
                        "birthday": "0001-11-14",
                        "lang": "ja",
                        "fields": [
                            {
                                "name": "出身",
                                "value": "千葉"
                            },
                            {
                                "name": "サークルサイト🌐",
                                "value": "https://blossomsarchive.com"
                            },
                            {
                                "name": "個人サイト🌐",
                                "value": "https://mizui-tech.uk"
                            },
                            {
                                "name": "Twitter:twitter:",
                                "value": "https://twitter.com/Mizui_Miduki"
                            },
                            {
                                "name": "Instagram",
                                "value": "https://www.instagram.com/mizui_miduki/"
                            },
                            {
                                "name": "Note",
                                "value": "https://note.com/mizui_miduki/"
                            },
                            {
                                "name": "ニコニコ:tvchan:",
                                "value": "https://nico.ms/user/72769031"
                            },
                            {
                                "name": "GitHub:github:",
                                "value": "https://github.com/MizuiMiduki"
                            },
                            {
                                "name": "YouTube:youtube:",
                                "value": "https://youtube.com/@o-getsustudio"
                            },
                            {
                                "name": "作ったbot🤖",
                                "value": "@3moji_random_ba @niconico_info_ba @4moji_random_ba @nvnb @math_ba @random_alphabet_ba @ai_note_ba @575_ba @n_moji_random_ba"
                            },
                            {
                                "name": "別鯖のアカウント",
                                "value": "@Mizui_Miduki@social.sda1.net @Mizui_Miduki@misskey.systems @Mizui_Miduki@mfmf.club @Mizui_Miduki@yojohan.cc"
                            },
                            {
                                "name": "fanbox",
                                "value": "https://mizui-miduki.fanbox.cc/"
                            }
                        ],
                        "verifiedLinks": [],
                        "followersCount": 132,
                        "followingCount": 508,
                        "notesCount": 3674,
                        "pinnedNoteIds": [
                            "9m63zil1mh"
                        ],
                        "pinnedNotes": [
                            {
                                "id": "9m63zil1mh",
                                "createdAt": "2023-11-17T11:36:21.205Z",
                                "userId": "9aarim2jy5",
                                "user": {
                                    "id": "9aarim2jy5",
                                    "name": "瑞井 箕月",
                                    "username": "Mizui_Miduki",
                                    "host": null,
                                    "avatarUrl": "https://proxy.misskeyusercontent.com/avatar.webp?url=https%3A%2F%2Fs3.arkjp.net%2Fmisskey%2F0aae340e-d923-4e3b-8664-2eb019502696.jpg&avatar=1",
                                    "avatarBlurhash": "efKnPo%4-DRk?H-aI.NEIobD9bn,xrxtRjV}oNt5bEj]xcWFNFWAof",
                                    "avatarDecorations": [
                                        {
                                            "id": "9m9q4c61alzk0btm",
                                            "url": "https://media.misskeyusercontent.com/io/7f797e40-9ab0-4f3b-b4c6-9d1103d637f2.png"
                                        }
                                    ],
                                    "isBot": false,
                                    "isCat": true,
                                    "emojis": {},
                                    "onlineStatus": "online",
                                    "badgeRoles": []
                                },
                                "text": "【自己紹介】\n@BlossomsArchive という同人サークルのくせにプログラミングもやってたりするよくわからにゃい組織で代表をやってる変にゃ人。\n \n最近はMisskeyクライアント“Mizuna”を開発中。\n:io:でBotを運用してたりもしてるから、プロフィールから見てほしい。",
                                "cw": null,
                                "visibility": "public",
                                "localOnly": false,
                                "reactionAcceptance": null,
                                "renoteCount": 0,
                                "repliesCount": 0,
                                "reactions": {
                                    ":sugoi@.:": 1
                                },
                                "reactionEmojis": {},
                                "fileIds": [],
                                "files": [],
                                "replyId": null,
                                "renoteId": null,
                                "mentions": [
                                    "9bgcv1p9t0"
                                ],
                                "clippedCount": 0
                            }
                        ],
                        "pinnedPageId": null,
                        "pinnedPage": null,
                        "publicReactions": false,
                        "followersVisibility": "public",
                        "followingVisibility": "private",
                        "twoFactorEnabled": false,
                        "usePasswordLessLogin": false,
                        "securityKeys": false,
                        "roles": [
                            {
                                "id": "9ablnrjc8m",
                                "name": "2年生",
                                "color": null,
                                "iconUrl": null,
                                "description": "Misskey.ioを使い始めて1年経過\nドライブの容量が12GBに",
                                "isModerator": false,
                                "isAdministrator": false,
                                "displayOrder": 0
                            }
                        ],
                        "memo": null,
                        "avatarId": "9gnhvx08i2",
                        "bannerId": "9m6txkixxl",
                        "isModerator": false,
                        "isAdmin": false,
                        "injectFeaturedNote": true,
                        "receiveAnnouncementEmail": false,
                        "alwaysMarkNsfw": false,
                        "autoSensitive": false,
                        "carefulBot": false,
                        "autoAcceptFollowed": true,
                        "noCrawle": false,
                        "preventAiLearning": true,
                        "isExplorable": true,
                        "isDeleted": false,
                        "twoFactorBackupCodesStock": "none",
                        "hideOnlineStatus": false,
                        "hasUnreadSpecifiedNotes": false,
                        "hasUnreadMentions": false,
                        "hasUnreadAnnouncement": false,
                        "unreadAnnouncements": [],
                        "hasUnreadAntenna": false,
                        "hasUnreadChannel": false,
                        "hasUnreadNotification": false,
                        "hasPendingReceivedFollowRequest": false,
                        "unreadNotificationsCount": 0,
                        "mutedWords": [],
                        "mutedInstances": [
                            "homoo.social"
                        ],
                        "mutingNotificationTypes": [],
                        "notificationRecieveConfig": {
                            "follow": {
                                "type": "all"
                            }
                        },
                        "emailNotificationTypes": [],
                        "achievements": [
                            {
                                "name": "following1",
                                "unlockedAt": 1675392141625
                            },
                            {
                                "name": "login3",
                                "unlockedAt": 1676014908972
                            },
                            {
                                "name": "login7",
                                "unlockedAt": 1676595559357
                            },
                            {
                                "name": "client30min",
                                "unlockedAt": 1676611499008
                            },
                            {
                                "name": "profileFilled",
                                "unlockedAt": 1676895086000
                            },
                            {
                                "name": "markedAsCat",
                                "unlockedAt": 1676895197524
                            },
                            {
                                "name": "notes1",
                                "unlockedAt": 1676895648938
                            },
                            {
                                "name": "followers1",
                                "unlockedAt": 1676896597979
                            },
                            {
                                "name": "noteDeletedWithin1min",
                                "unlockedAt": 1676898179104
                            },
                            {
                                "name": "notes10",
                                "unlockedAt": 1676901405613
                            },
                            {
                                "name": "postedAtLateNight",
                                "unlockedAt": 1677254491853
                            },
                            {
                                "name": "login15",
                                "unlockedAt": 1677585771595
                            },
                            {
                                "name": "following10",
                                "unlockedAt": 1677817957766
                            },
                            {
                                "name": "selfQuote",
                                "unlockedAt": 1677830428957
                            },
                            {
                                "name": "justPlainLucky",
                                "unlockedAt": 1677897014261
                            },
                            {
                                "name": "myNoteFavorited1",
                                "unlockedAt": 1677898290682
                            },
                            {
                                "name": "noteFavorited1",
                                "unlockedAt": 1677898339698
                            },
                            {
                                "name": "followers10",
                                "unlockedAt": 1677898389236
                            },
                            {
                                "name": "notes100",
                                "unlockedAt": 1677925267786
                            },
                            {
                                "name": "login30",
                                "unlockedAt": 1678865233931
                            },
                            {
                                "name": "notes500",
                                "unlockedAt": 1681137648025
                            },
                            {
                                "name": "login60",
                                "unlockedAt": 1681528362836
                            },
                            {
                                "name": "cookieClicked",
                                "unlockedAt": 1683163070420
                            },
                            {
                                "name": "following50",
                                "unlockedAt": 1683422108951
                            },
                            {
                                "name": "notes1000",
                                "unlockedAt": 1683952564712
                            },
                            {
                                "name": "client60min",
                                "unlockedAt": 1684295853987
                            },
                            {
                                "name": "login100",
                                "unlockedAt": 1684973760126
                            },
                            {
                                "name": "setNameToSyuilo",
                                "unlockedAt": 1686143152387
                            },
                            {
                                "name": "noteClipped1",
                                "unlockedAt": 1686143495448
                            },
                            {
                                "name": "viewInstanceChart",
                                "unlockedAt": 1686143729912
                            },
                            {
                                "name": "iLoveMisskey",
                                "unlockedAt": 1686143848485
                            },
                            {
                                "name": "collectAchievements30",
                                "unlockedAt": 1686144083692
                            },
                            {
                                "name": "foundTreasure",
                                "unlockedAt": 1686144103758
                            },
                            {
                                "name": "clickedClickHere",
                                "unlockedAt": 1686144115474
                            },
                            {
                                "name": "viewAchievements3min",
                                "unlockedAt": 1686144315970
                            },
                            {
                                "name": "open3windows",
                                "unlockedAt": 1686302474920
                            },
                            {
                                "name": "outputHelloWorldOnScratchpad",
                                "unlockedAt": 1686317549626
                            },
                            {
                                "name": "driveFolderCircularReference",
                                "unlockedAt": 1686317741104
                            },
                            {
                                "name": "brainDiver",
                                "unlockedAt": 1686317974572
                            },
                            {
                                "name": "following100",
                                "unlockedAt": 1688564235295
                            },
                            {
                                "name": "followers50",
                                "unlockedAt": 1689764982542
                            },
                            {
                                "name": "reactWithoutRead",
                                "unlockedAt": 1692329392829
                            },
                            {
                                "name": "login200",
                                "unlockedAt": 1693626014344
                            },
                            {
                                "name": "postedAt0min0sec",
                                "unlockedAt": 1698307201113
                            },
                            {
                                "name": "loggedInOnBirthday",
                                "unlockedAt": 1699887695421
                            },
                            {
                                "name": "following300",
                                "unlockedAt": 1700399135844
                            },
                            {
                                "name": "tutorialCompleted",
                                "unlockedAt": 1700748614396
                            },
                            {
                                "name": "smashTestNotificationButton",
                                "unlockedAt": 1700752500385
                            },
                            {
                                "name": "followers100",
                                "unlockedAt": 1701489814496
                            },
                            {
                                "name": "login300",
                                "unlockedAt": 1702256722619
                            },
                            {
                                "name": "loggedInOnNewYearsDay",
                                "unlockedAt": 1704036412508
                            },
                            {
                                "name": "bubbleGameExplodingHead",
                                "unlockedAt": 1705041881887
                            },
                            {
                                "name": "passedSinceAccountCreated1",
                                "unlockedAt": 1705925655338
                            }
                        ],
                        "loggedInDays": 359,
                        "policies": {
                            "gtlAvailable": true,
                            "ltlAvailable": true,
                            "canPublicNote": true,
                            "canCreateContent": true,
                            "canUpdateContent": true,
                            "canDeleteContent": true,
                            "canUpdateAvatar": true,
                            "canUpdateBanner": true,
                            "canInvite": false,
                            "inviteLimit": 0,
                            "inviteLimitCycle": 10080,
                            "inviteExpirationTime": 0,
                            "canManageCustomEmojis": false,
                            "canManageAvatarDecorations": false,
                            "canSearchNotes": true,
                            "canUseTranslator": true,
                            "canUseDriveFileInSoundSettings": false,
                            "canHideAds": false,
                            "driveCapacityMb": 12287,
                            "alwaysMarkNsfw": false,
                            "pinLimit": 3,
                            "antennaLimit": 5,
                            "wordMuteLimit": 200,
                            "webhookLimit": 3,
                            "clipLimit": 10,
                            "noteEachClipsLimit": 50,
                            "userListLimit": 5,
                            "userEachUserListsLimit": 20,
                            "rateLimitFactor": 2,
                            "avatarDecorationLimit": 1
                        }
                    }
                }

        if (get_user_data.ok == false) {
            // 取得できなかったとき
            console.warn("アカウントデータを取得できませんでした")
        } else {
            // indexedDBに登録
            add_indexeddb(get_user_data, address)
        }
    });
});
