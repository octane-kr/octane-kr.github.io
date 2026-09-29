---
layout: ../../layouts/PostLayout.astro
---

이번 대회는 후기를 쓸 게 없어서 아래 두 사진으로 대체한다.

![The 5th Universal Cup Stage 2: Grand Prix of EPS 대회 게시글의 평가](./images/universal-cup-5-stage-2-eps-rating.png)
![대회에 대한 tourist의 댓글](./images/universal-cup-5-stage-2-eps-tourist-comment.png)

우리 팀은 2솔을 했고, 아래는 그중 내가 푼 두 문제의 풀이다. `abra_stone`은 J, `gs20036`은 C를 잡았지만 각각 TLE와 WA on 39를 뚫지 못했다.

## 내가 푼 문제 풀이

### E. EPS.AC

3명이 $n$문제에 난이도 투표를 했다. 이때 문제별로 티어를 매겨야 하는데, 같은 티어에 여러 수를 넣을 수도 있다. 티어가 valid하다는 것은 티어의 경계마다 최소 2명이 완전히 동의한다는 뜻이다. 티어의 경계에 동의한다는 것은 자신이 투표한 난이도 순서가 해당 경계를 기준으로 역전되지 않는다는 뜻이다. 이때 최대한 많은 티어를 만드는 문제다.

대충 난이도 투표가 순열처럼 주어지는데, 그냥 세 순열을 동시에 앞에서부터 보면서 두 개의 prefix에 들어가는 문제의 집합이 같은 순간마다 티어의 경계로 정하면 된다. 이때 직전에 정해진 티어 경계와 이번 경계에 모두 동의하는 사람이 있으므로 construction은 자명하다. 두 개의 prefix가 같은지는 여러 방법으로 판단할 수 있을 것 같은데 나는 그냥 한쪽 순열을 $1, 2, \ldots, n$으로 다시 이름 붙였을 때 다른 한쪽 순열을 $i$번째까지 본 것의 최댓값이 $i$가 된다 같은 느낌으로 판정했다. 말로 하면 어렵지만 아래 코드를 보면 간단하다.

```c++
#include<bits/stdc++.h>
using namespace std;

int t, n, arr[5][200005], brr[5][200005];

int main(){
    scanf("%d", &t);
    while(t--){
        scanf("%d", &n);
        for(int i=0;i<3;i++){
            for(int j=1;j<=n;j++){
                scanf("%d", &arr[i][j]);
                brr[i][arr[i][j]] = j;
            }
        }
        int res = 0, mx[5][5];
        for(int i=0;i<3;i++){
            for(int j=0;j<3;j++) mx[i][j] = 0;
        }
        for(int i=1;i<=n;i++){
            int tmp = 0;
            for(int j=0;j<3;j++){
                int ttmp = 0;
                for(int k=0;k<3;k++){
                    mx[k][j] = max(mx[k][j], brr[j][arr[k][i]]);
                    if(mx[k][j]==i) ttmp++;
                }
                tmp = max(tmp, ttmp);
            }
            if(tmp>=2) res++;
        }
        printf("%d\n", res);
    }
}
```

### M. Median Equals X

수열이 주어지고 $x$가 주어지면 subsequence 중 중앙값이 $x$인 것의 개수를 세는 문제다.

subsequence의 길이가 홀수인 경우부터 생각해 보자. $x$보다 작은 게 $a$개, $x$가 $b$개, $x$보다 큰 게 $c$개 있다고 하자. 편의상 $x$끼리도 대소가 있다고 생각하면 생각이 쉽다. 그러면 $i=a+1$부터 $a+b$에 대해 $1, \ldots, i-1$과 $i+1, \ldots, n$에서 같은 만큼의 수를 뽑는 문제가 된다. $p$개 중에 $r$개, $q$개 중에 $r$개를 뽑는 경우의 수는 $\binom{p}{r}\binom{q}{r} = \binom{p}{r}\binom{q}{q-r}$이므로 이를 $r$들에 대해 싹 더하면 $\binom{p+q}{q}$가 된다. $(1+x)^{p+q}$의 $q$차항의 계수로 생각해도 되고 그냥 조합적 의미를 생각해도 된다. 따라서 $\sum_{i=a+1}^{a+b}\binom{n-1}{i-1}$를 계산하면 된다.

subsequence의 길이가 짝수인 경우에도 크게 다르지 않은데, 대충 크기순으로 나열한 다음 $i$번째 수와 더해서 $2x$가 되는 수가 $l_i$번째부터 $r_i$번째까지에 있다고 하자. $l_i$가 $i$ 이하일 수 있으니 $i+1$과 $\max$를 취해 버리자. 그러면 중복해서 셀 일이 없다. 이제 위에서 구한 것을 생각하면 $\sum_{j=l_i}^{r_i}\binom{i-1+n-j}{i-1} = \sum_{j=l_i}^{i+n-1}\binom{i-1+n-j}{i-1}-\sum_{j=r_i+1}^{i+n-1}\binom{i-1+n-j}{i-1} = \binom{i+n-l_i}{i}-\binom{i+n-r_i-1}{i}$를 얻는다. 이를 $i$들에 대해 더해 주면 된다.
