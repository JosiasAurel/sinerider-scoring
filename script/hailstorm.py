#!/usr/bin/python3
import argparse
import os
import random
from concurrent.futures import ThreadPoolExecutor

import requests
import threading
import time

parser = argparse.ArgumentParser(
    prog='scorespammer',
    description='Performs load tests on a scoring-service cluster & gathers performance statistics.',
    epilog='Have a nice day!')

parser.add_argument('uri', help='A URI that points at a sinerider-scoring stack')
parser.add_argument('-d', '--dryrun', action='store_true', default=True, required=False)
parser.add_argument('-r', '--rate', required=True, help="The rate at which requests should be sent (per second).")
parser.add_argument('-n', '--numreqs', required=True, help="The total number of requests that should be sent.")
parser.add_argument('-t', '--threads', required=True,
                    help="The total number of threads to use (max # of parallel requests).")

args = parser.parse_args()

stack_uri = args.uri
dryrun = args.dryrun
request_rate = float(args.rate)
total_requests = int(args.numreqs)
num_threads = int(args.threads)
stats_lock = threading.Lock()

global successes
global failures
global exceptions

successes = 0
failures = 0
exceptions = 0
response_times = []


def get_random_level_data():
    choice = random.randint(0, 3)
    if choice == 0:
        # successful, 5 sec, performant
        return {"expectedResult": "success",
                "url": "https://sinerider.hackclub.dev/?N4IgbiBcAMB0CMAaEA7AlgYwNZRAZQBkB5ABQFEB9AOTIHEBBAFQEkA1MkZDAewFsAHADYBTAC7CAJlFEAnAK7DkAZwCGYSQRXiAHrgC0u5AHNuKwUqgo5gwQF8gA==="}
    elif choice == 1:
        return {"expectedResult": "timeout",
                "url": "https://sinerider.com/?N4IgdghgtgpiBcIDKBLMMBOKAmmAEAIhCgDYCeeACgK4BetJMeAxAEwCMIANOCgMYBrBCAAOdBjAD6HbiGwYIAdwDyGXBgTsADDq08AHggC02nmQR65MAGYRqJAC4BRfSIwwAzh5QB7MMK1ZAHMfCBIPBABtUEN4dgBmMwQANh4HMhE4RGwySCh+WR81TGEAIRAAXy4YzUtzeEt0zOFrFH0YbELijUQAQUqAXR4PRmx1CPhokFijAHYeCC8YB2EUKAggzwA6CGwISRGOwZ4AI19YYWXMSBIAYQgwMj9ZFA8aekYEBwxqGAqgA==="}
    else:
        # successful, 26 sec, non-performant
        return {"expectedResult": "success",
                "url": "https://sinerider.com/?N4IgdghgtgpiBcACEBlAlmGAnNATbiAIhGgDYCeiACgK4BedpMiAxAIwgA0yYaAxgGsEyAA71GMAPoduIXFggB3APJZ8WYWwAMOrbIAewgLTbZ5YXuT4AZhBqkALgFF9IrDADOHtAHswwkC0uZABzHwhSD2EAbVBDJAAmM2NTZAdyETgkEGs0fRhcEABfbjiUgDZkpCMATll0zIDcckgofmLSkHjEIwAWKp66tIys5Fz8wpLEMqQAdgGTJOHG7PGCjumuzTYFgFZ6kYC1yYBdWQ8mXHUopFitpDZ95AgvGAcAtCgIEM8AOghcBBJBd1lMZj02EsQC8PG8Pl8fh5fgArCCCYGXYpnZAAI18sAC3jANA8PjwEUInmw71kaA8tAYTGEDiwNBgshgrncXl8YGUADdsDh8AFfmx9AA9BJGADMWgAOvLEABqRWIRVExVMawOAAUcocipwIQAFg4AJTFIA"}


def was_correct(expected_result, http_code, json):
    if expected_result == "success" and json["time"] is not None:
        return http_code == 200

    if expected_result == "timeout":
        return json["time"] is None and http_code == 200
    return False


def make_request():
    global successes, failures, exceptions
    start_time = time.time()
    url = "%s/score" % (stack_uri)
    print("Issuing request to %s" % (url))
    random_level_data = get_random_level_data()

    payload = {"level": random_level_data["url"]}

    try:
        r = requests.post(url, json=payload, auth=('hackclub', os.getenv("SINERIDER_SCORING_PASSWORD")))
        was_successful = was_correct(random_level_data["expectedResult"], r.status_code, r.json())
        print("expectedResult: %s was_successful: %s [%d] time: %s" % (random_level_data["expectedResult"], was_successful, r.status_code, r.json()["time"]))
        if was_successful:
            successes += 1
        else:
            failures += 1
    except:
        exceptions += 1
    finally:
        response_times.append(time.time() - start_time)


starting_time = time.time()
with ThreadPoolExecutor(max_workers=num_threads) as executor:
    for num in range(0, total_requests):
        time_to_sleep = 1.0 / float(request_rate)
        time.sleep(time_to_sleep)
        executor.submit(make_request)
ending_time = time.time()

print("successes: %d failures: %d exceptions: %d" % (successes, failures, exceptions))
print("Response times: %s" % (response_times))
elapsed_time_sec = ending_time - starting_time
rate_per_second = float(total_requests) / float(elapsed_time_sec)
rate_per_minute = rate_per_second * 60.0
print("Requests/min: %.02f" % rate_per_minute)