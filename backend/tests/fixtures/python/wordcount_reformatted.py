# word counter -- same logic, different spacing and comments
import sys
def clean( word ):
    # strip punctuation
    return "".join( ch for ch in word.lower() if ch.isalnum() )


def count_words( lines ):
    """Count every word."""
    counts = {}
    for line in lines:

        for raw in line.split():
            word = clean( raw )
            if not word :
                continue
            if word in counts :
                counts[ word ] += 1
            else :
                counts[ word ] = 1
    return counts
def top_words( counts , n ):
    ranked = sorted( counts.items() ,
                     key = lambda pair : ( -pair[1] , pair[0] ) )
    return ranked[ : n ]
def main():
    lines = sys.stdin.readlines()
    counts = count_words( lines )
    for word , total in top_words( counts , 5 ):
        print( word + ": " + str( total ) )
if __name__ == "__main__" :
    main()
