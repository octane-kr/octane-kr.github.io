---
title: "Kernelization (Vertex Cover)"
date: 2026-05-21
publishedAt: 2026-05-21T18:16:00+09:00
updatedAt: 2026-05-21T18:16:00+09:00
category: "Graph Theory"
subcategory: "Algorithms for NP-hard Problems"
layout: ../../layouts/PostLayout.astro
---

이 글은 2026년 봄학기에 KAIST에서 수강한 Algorithms for NP-hard Problems 강의의 [lecture note](https://github.com/ssimplexity/CS492_spring2026/blob/main/Lecture_Note_CS492.pdf)를 기반으로 한다.

이 글은 PS에서 다루는 그래프 이론에 익숙한 사람을 예상 독자로 하여, 쉬운 전달을 목표로 한다. 엄밀한 정의와 서술은 lecture note 원본에서 확인할 수 있다. 그래프에 관련된 일반적인 notation은 따로 정의하지 않는다. 정점 $n$개, 간선 $m$개를 가진 그래프를 다룰 때 $O^*(f(k, n, m))$은 $O(f(k, n, m) \cdot \text{poly}(k+n+m))$ 정도의 뜻을 가진다. 즉, polynomial factor는 무시한다.

## Kernelization

Kernelization은 주어진 입력을 동치인 다른 입력으로 바꾸어 크기를 줄이는 다항 시간 알고리즘을 의미한다. 입력이 동치라는 것은 원본에 대한 답이 True일 때는 True, False일 때는 False가 답이 되는 입력을 의미한다. [Branching Algorithms](https://octane-kr.github.io/posts/branching-algorithms-1-vertex-cover-feedback-vertex-set/)에서 다룬 FEEDBACK VERTEX SET 문제의 알고리즘 중 차수가 $1$인 정점과 연결된 간선을 제거하고 차수가 $2$인 정점을 제거하면서 incident한 두 간선을 합치는 과정이 있었는데, 이 역시 동치인 입력을 만드는 알고리즘의 예시라고 할 수 있다. Kernelization은 보통 몇 가지 reduction rule을 적용하는 방식으로 기술할 수 있다. 위 예시의 경우 두 가지 reduction rule을 적용하는 예시이다. Kernelization의 결과로 만들어지는 새 입력을 kernel이라고 한다.

## $2k^2$-size kernelization for VERTEX COVER

> ### VERTEX COVER
>
> **입력:** Graph $G$와 양의 정수 $k$가 주어진다.
>
> **출력:** $G$의 크기 $k$ 이하인 vertex cover가 존재하는가?

그래프 $G$에 대해 $X \subseteq V(G)$가 $G$의 vertex cover라는 것은 $G$의 모든 간선에 대해 최소 한 개의 endpoint가 $X$에 포함된다는 것을 의미한다.

간단한 예시로 kernelization을 이해해보자. 아래 두 가지 reduction rule을 적용한 그래프를 생각하자.

1. 차수가 $0$인 정점 하나를 제거한다.
2. 차수가 $k+1$ 이상인 정점 하나를 제거하고 $k$를 $1$ 감소시킨다.

차수가 $0$인 정점이 vertex cover에 영향을 주지 않음은 자명하다. 또한 어떤 정점이 vertex cover에 포함되어 있지 않다면 해당 정점에 인접한 모든 정점이 vertex cover에 들어가야 하므로, vertex cover의 크기가 $k$ 이하이기 위해서는 vertex cover가 모든 차수가 $k+1$ 이상인 정점을 포함해야 한다. 따라서 위 두 reduction rule은 올바른 kernel을 만듦이 보장된다.

이렇게 얻은 kernel을 $(G', k')$이라고 해보자. 이때 $G'$의 모든 정점은 차수가 $1$ 이상 $k'$ 이하임을 알 수 있다. 따라서 간선의 개수는 최소 $\frac{|V(G')|}{2}$이고 크기가 $k'$ 이하인 vertex cover가 cover할 수 있는 간선의 최대 개수는 $k'^2$이다. 즉, $G'$의 정점이 $2k'^2$개를 초과한다면 바로 False를 return할 수 있다(엄밀히는, kernelization은 새로운 입력을 만드는 알고리즘이므로 중간에 True, False를 return할 수 없기에 상수 크기의 '답이 True인 입력', '답이 False인 입력'을 하나씩 제시하고 해당 입력을 return한다는 식으로 서술해야 한다. 그러나 앞으로도 이에 관해서는 대충 넘어가기로 하자). 그렇지 않다면, $k'$은 당연히 $k$보다 작으므로 우리는 $2k^2$ 크기의 kernel을 얻는다.

Lecture note는 같은 reduction을 다르게 분석하여 $k^2$ 정도의 size bound를 얻으니 관심 있다면 읽어보도록 하자.

## $2k$-size kernelization for VERTEX COVER

> ### VERTEX COVER
>
> **입력:** Graph $G$와 양의 정수 $k$가 주어진다.
>
> **출력:** $G$의 크기 $k$ 이하인 vertex cover가 존재하는가?

Branching Algorithms의 [LP 기반 VERTEX COVER 알고리즘](https://octane-kr.github.io/posts/branching-algorithms-2-vertex-cover-with-lp/)을 떠올리자. 거기서 $C, R, H$ 분할을 다시 가져오고, 아래 reduction rule을 생각하자.

1. $(G, k)$를 $(G[R], k-|H|)$로 교체한다.

이는 앞 글에서도 사용한 reduction이므로 정당성에 대한 증명은 생략한다. Branching algorithm에서는 depth를 제한하기 위해 추가적인 처리를 했지만, 이번에는 이렇게 만들어지는 kernel의 크기만 분석하면 된다.

$R$이 $\frac{|R|}{2}$보다 작은 vertex cover를 가진다고 해보자. 그렇다면 이로부터 만들어지는 $G[R]$에 대한 LP의 해 $x^*_R$이 존재한다. $R$과 $C$ 사이에는 간선이 존재할 수 없으므로, $G$의 optimal solution $x^*$에서 $R$ 부분을 $x^*_R$로 교체할 수 있고 이때 더 작은 해를 얻게 되어 모순이다. 즉, $R$의 vertex cover는 최소 $\frac{|R|}{2}$의 크기를 가진다.

즉, reduction이 끝나고 얻은 kernel을 $(G', k')$이라 할 때 $|V(G')| > 2k'$이면 바로 False를 return할 수 있다. 그렇지 않다면, $k'$은 당연히 $k$보다 작으므로 우리는 $2k$ 크기의 kernel을 얻는다.

이 kernelization은 LP를 다항 시간에 푸는 것을 기반으로 한다. 그러나 이는 상당히 큰 사전지식을 요구하며 LP-solver 등을 이용하지 않고 구현하기 어렵기에, LP를 사용하지 않는 방법도 소개하고자 한다. 잘 관찰해보면 아래 네 조건을 가진 $C, R, H$를 찾기만 하면 같은 reduction을 수행 가능하다는 사실을 알 수 있다.

1.  $H, C \neq \emptyset$.
2.  $C$는 independent set이다. 즉, $C$ 내부에는 간선이 없다.
3.  $C$와 $R$ 사이에는 간선이 없다.
4.  모든 $H' \subseteq H$에 대해 $|H'| \leq |N(H') \cap C|$이다.

간단히 설명하자면, 2, 4번 조건 때문에 optimal한 vertex cover가 있다면 $H$를 전부 포함하고 $C$를 포함하지 않는 vertex cover를 얻어낼 수 있다. 이후 3번 조건 때문에 $G[R]$의 vertex cover를 찾는 문제로 안전하게 환원이 가능해진다.

이런 decomposition을 **Crown Decomposition**이라고 부른다. 집합의 이름이 저렇게 지어진 것도 Crown, Head, Remainder 때문이라는 이야기가 있는데 출처는 잘 모르겠지만 시각적으로 직관적이다. 이제 $R$이 작은 crown decomposition을 찾는 알고리즘을 알아보자.

그래프가 주어졌을 때 최대 매칭 $M$을 빠르게 구할 수 있음은 [알려져 있다](https://koosaga.com/258). 만약 $M$의 크기가 $k$보다 크다면 크기가 $k$ 이하인 vertex cover가 존재할 수 없으므로 바로 False를 return할 수 있다. 이제 $M$의 크기가 $k$ 이하인 경우만 생각하자. 우선 $V(G) \setminus V(M)$이 independent set이 아니면 더 큰 매칭을 찾을 수 있으므로 $C = V(G) \setminus V(M)$이라고 해보자. 그러면 자연스럽게 $H = N(C), R = V(M) \setminus H$로 정의해볼 수 있다. 그러면 만족시켜야 하는 남은 조건은 4번 조건이다.

4번 조건을 만족시키지 않는 $H'$이 있다고 해보자. 그러면 $C' = N(H') \cap C$를 정의할 수 있고, $|H'| > |C'|$이다. 따라서 그냥 $H$와 $C$에서 $H', C'$을 각각 제거하고 전부 $R$에 넣어버리기로 하자. 더 이상 그러한 $H'$가 없어질 때까지 시행해도, $R$의 크기는 커봤자 $r_0+2h_0 \leq 2(r_0+h_0) = 4|M| \leq 4k$이다. 물론 $r_0, h_0$는 초기 $R, H$의 크기이다. 위 과정에서 $C$ 내부에 간선이 생기거나 $C, R$ 사이에 간선이 생기지 않으므로 최종적으로 얻은 $C, R, H$는 crown decomposition을 형성한다. 즉 이 알고리즘은 $4k$ 이하의 크기를 가지는 kernel을 생성한다.