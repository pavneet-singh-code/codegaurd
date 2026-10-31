def fib(n, memo={}):
    if n < 2:
        return n
    if n not in memo:
        memo[n] = fib(n - 1) + fib(n - 2)
    return memo[n]


def primes_below(limit):
    sieve = [True] * limit
    sieve[0:2] = [False, False]
    for i in range(2, int(limit ** 0.5) + 1):
        if sieve[i]:
            for j in range(i * i, limit, i):
                sieve[j] = False
    return [i for i, ok in enumerate(sieve) if ok]


def gcd(a, b):
    while b:
        a, b = b, a % b
    return a


if __name__ == "__main__":
    print([fib(i) for i in range(15)])
    print(primes_below(50))
    print(gcd(84, 36))
