# Third-party notices

This file lists what comes from other people. The backend in this repository has **no runtime dependencies** (only Node.js built-ins), and the tools and the evaluation script use only Node.js built-ins too. The Android app lives in its own repository, [atabold-keyboard-android](https://github.com/Atabold/atabold-keyboard-android), and brings in the items below.

## FUTO Keyboard

The Android app is a modified fork of [FUTO Keyboard](https://github.com/futo-org/android-keyboard), © FUTO Holdings, Inc., used under the **FUTO Source First License 1.1-kb**. The licence text is the file `LICENSE.md` of the Android repository and is kept unchanged. This project is not affiliated with, endorsed by or supported by FUTO. "FUTO" and "FUTO Keyboard" belong to FUTO Holdings, Inc.

The FUTO licence is not the licence of this repository: the backend, tools, evaluation set, prompts and documentation here are under the [GNU Affero General Public License](LICENSE), version 3 or any later version. See the [README](README.md#licences) for how the two fit together.

## Android Open Source Project keyboard

FUTO Keyboard is itself a fork of the Android Open Source Project keyboard (LatinIME). The original AOSP code is under the Apache License 2.0, © 2008 The Android Open Source Project; the Android repository keeps the `NOTICE` file that says so and holds the licence text. The same file notes: "Includes Dictionaries © Lexiteria LLC. Used by permission."

## Lucide icons

The toolbar icons added by the fork (`pilcrow`, `wand-sparkles`, `languages`, `flame`, `cloud`, `cloud-off`, `lock`) come from [Lucide](https://lucide.dev/). The licence of the Lucide repository, copied verbatim:

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

Some Lucide icons are derived from the Feather project (list in the Lucide
repository); for those icons:

The MIT License (MIT)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Gelasio (the letter é of the logo and of the icon)

The letter é in the logo images (`docs/images/logo-light.svg` and `docs/images/logo-dark.svg`) and in the launcher icon of the Android repository is outlined from **Gelasio Bold**, © 2022 The Gelasio Project Authors, under the SIL Open Font License 1.1. Only that one outline is used, as a drawing, and it stays under the OFL. The licence, copied verbatim:

```text
Copyright 2022 The Gelasio Project Authors (https://github.com/SorkinType/Gelasio)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

## Development tools

Not shipped to anyone: TypeScript (Apache-2.0), Vitest (MIT) and `@types/node` (MIT), with their own dependencies, listed in `backend/package-lock.json`. Their licences travel with the packages that `npm ci` installs.

## Services and names

The default setup calls the Mistral AI API, runs on Scaleway Serverless Functions, and can send alerts through the Telegram Bot API. These are services, not code in this repository; your accounts are under their terms. Product and company names (FUTO, Mistral AI, Scaleway, Telegram, WhatsApp, Gmail and the other apps in the list of allowed apps, and so on) belong to their owners and appear only to identify them. No affiliation or endorsement is implied.
