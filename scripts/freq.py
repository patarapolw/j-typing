from wordfreq import zipf_frequency
import json

import os

os.chdir("./scripts")


def make_ja_freq():
    ja_freq = {
        "common": {},
    }

    with open("../public/jmdict-eng-common-3.5.0.json", "r", encoding="utf8") as fin:
        for r in fin:
            if r.startswith('{"id":'):
                d = json.loads(r[:-2])

                for t in ["kanji"]:
                    for k in d[t]:
                        text = k["text"]
                        if text not in ja_freq:
                            if k["common"]:
                                if text not in ja_freq["common"]:
                                    ja_freq["common"][text] = zipf_frequency(text, "ja")
                            else:
                                ja_freq[text] = zipf_frequency(text, "ja")

    with open("../assets/ja_freq.json", "w", encoding="utf8") as f:
        json.dump(ja_freq, f, ensure_ascii=False, indent=0)


if __name__ == "__main__":
    make_ja_freq()
