---
title: "Tree decomposition"
publishedAt: 2026-05-25T06:20:00+09:00
updatedAt: 2026-05-25T07:41:00+09:00
category: "Graph Theory"
layout: ../../layouts/PostLayout.astro
---

Tree decomposition은 그래프 이론 수업을 듣거나 논문을 읽으면 밥 먹듯이 나오는 주제이다. 그러나 관련 알고리즘이 대부분 복잡한 구현을 필요로 하거나 시간복잡도가 매우 큰 편이라 PS에서는 잘 다뤄지지 않는 주제이기도 하다. 최근에는 조금씩 관련 문제가 출제되고 있지만 대회의 보스급 문제에 위치해 정해는 관상용으로 여겨지는 경우가 많다. 이 글은 Tree decomposition을 직관적으로 설명하는 것을 목적으로 한다.

Sqrt decomposition, centroid decomposition 등 PS러에게 익숙한 decomposition은 보통 말 그대로 주어진 대상을 여러 part로 쪼개는 기법들이다. Tree decomposition은 이와는 조금 다른데, 그래프 $G$가 주어지면 가상의 새로운 tree $T$를 옆에 두고 $G$의 각 정점을 $T$의 node 몇 개에 넣는 식으로 이루어진다. 즉 $T$의 node 하나는 $G$의 정점 여러 개를 담고 있고, 이를 bag이라고도 부른다. 이 글에서 각 notation의 엄밀한 type은 정의하지 않고, 때로는 섞어서 사용할 수도 있으니 맥락에 맞게 이해하도록 하자(node와 bag을 혼용할 수 있다는 뜻이며, 정점과 node는 사실 다르지 않지만 벌써 섞어서 쓰고 있다). 또한, 물론 $G$의 한 정점이 $T$의 여러 bag에 들어가기도 한다.

$T$의 node가 주어지면 $G$의 어떤 정점을 담은 bag인지 알려주는 함수를 보통 $\chi$ 혹은 $\beta$라고 쓴다(필자는 $\chi$를 선호한다). 즉, $G$의 tree decomposition은 $(T, \chi)$의 pair로 나타난다. $\chi$의 type은 물론 $V(T) \to 2^{V(G)}$이다. Tree decomposition이 만족해야 하는 성질은 아래와 같다.

1. $G$의 각 정점 $v$에 대해 $v$를 포함하는 bag들은 $T$ 위에서 connected이다.
2. $G$에 간선 $uv$가 존재한다면 $u, v$를 동시에 포함하는 $T$의 bag이 적어도 하나 존재한다.
3. $G$의 각 정점은 최소 한 개의 bag에 들어간다(이 조건에 관해 깊이 생각할 필요는 없다. Isolated vertex를 어디에도 넣지 않는 일 등이 일어나지 않게 하기 위한 사소한 조건이다).

$G$에서 인접하지 않은 정점이라고 $T$에서 떨어져 있어야 할 필요는 없음에 유의하여라. 예를 들어 $T$의 node가 1개이고 해당 node의 bag이 $G$의 모든 정점을 포함한다면 이는 valid한 tree decomposition이라고 할 수 있다.

만약 $G$가 tree라면 $G$를 기반으로 그냥 각 edge에 대응되는 node를 추가해서 tree decomposition을 얻을 수 있다. $G$에서 $u$와 $v$가 연결되어 있다면 $T$ 위에서는 $\{u\}, \{u, v\}, \{v\}$ 순으로 연결하면 된다는 뜻이다. 이렇게 만든 tree decomposition이 valid함은 어렵지 않게 확인할 수 있다.

만약 $G$가 cycle이라면 어떨까? $G$에서 정점 하나를 떼면 path가 나온다. 뗀 정점을 $v$라고 하자. 이때 path는 자명히 tree이므로 위와 같은 방법으로 $G-v$의 tree decomposition을 구할 수 있다. 그 다음, 그냥 모든 bag에 $v$를 넣어버리면 $G$의 valid한 tree decomposition을 얻을 수 있다.

위 두 예시에서 가장 큰 bag의 크기를 관찰해보자. Tree의 경우에는 bag의 최대 크기가 2이고, cycle의 경우는 bag의 최대 크기가 3이다. 이로부터 느낄 수 있는 사실은, 그래프가 tree에서 벗어날수록 작은 bag만으로 tree decomposition을 만들 수 없을 것 같다는 점이다. 참고로 tree와 cycle에서 위 예시보다 작은 최대 bag을 가지는 tree decomposition은 없음이 알려져 있다($G$가 정점 1개짜리 tree일 때 크기 1의 bag만으로 표현이 가능하기 때문에 불편하다면 당신은 높은 확률로 [parkky](https://codeforces.com/profile/parkky)이다).

따라서, **tree decomposition의 최대 bag의 크기**는 그래프가 tree와 얼마나 비슷한지를 나타내는 유의미한 척도가 될 것이라고 생각할 수 있다. 이를 tree decomposition의 width라고 하자. 이때 자연스럽게 $G$가 고정되었을 때 가능한 tree decomposition 중 width가 가장 작은 것을 택하고 싶을 것이다. 이를 optimal tree decomposition이라고 하며, optimal tree decomposition의 width를 **$G$의 treewidth**라고 한다.

위에서 끝낼 수도 있지만, 사실 width는 최대 bag의 크기에서 1을 뺀 양으로 정의한다. 이유는 그저 tree의 treewidth를 1로 만들고 싶기 때문이다. Treewidth를 쉽게 구할 수 있는 그래프의 예시로는 tree, cycle, cactus, clique 등이 있다(시도해 보라).

Tree decomposition이 왜 좋은지 생각해보자. Maximum independent set(MIS) 문제는 일반적인 그래프에서 다항 시간에 동작하는 풀이가 없음이 알려져 있지만, tree의 MIS를 구하는 것은 DP를 이용한 골드 정도의 풀이가 존재한다. 대충 주어진 그래프를 rooted tree로 생각하고 각 정점의 subtree에 대한 최적해를 구하는데, 해당 정점이 포함되는 경우와 포함되지 않는 경우로 나눠서 DP를 저장하고 전이하면 된다.

이 풀이를 거의 그대로 tree decomposition 위로 옮길 수 있다. 마찬가지로 rooted tree decomposition을 생각하고, 한 node의 subtree에 대한 최적해를 구한다고 생각해보자. 한 가지 관찰하고 넘어가야 할 사실은 다음과 같다.

- $T$의 node $a$의 subtree에 $G$의 정점 $v$를 포함하는 bag이 존재하고, $a$의 bag은 $v$를 포함하지 않을 때, $v$에 관한 정보는 더 이상 필요하지 않다.

$G$가 tree일 때의 DP 풀이에서 내가 보는 정점 아래의 정보를 더 이상 저장하지 않는 것과 같은 맥락으로 생각하면 된다. 어차피 $a$의 부모에서 전이를 받을 때 $v$가 쓰인 MIS와 $v$가 쓰이지 않은 MIS는 다르지 않기 때문이다. 이는 tree decomposition에서 $v$를 포함하는 bag들이 connected이고, $G$에서 두 정점이 인접하기 위해서는 $T$에서 최소 하나의 bag에 함께 들어 있어야 함을 생각하면 자연스럽다.

즉, 우리는 $a$의 subtree에 대한 DP에서 저장해야 할 케이스는 $2^{|\chi(a)|}$개임을 알 수 있다. $\chi(a)$의 각 정점이 쓰이거나 쓰이지 않은 모든 케이스를 비트마스킹으로 저장한다고 보면 된다. 상세한 전이 과정은 꽤 복잡해 보이지만, 설명은 생략한다. 어차피 뒤에서 설명할 좋은 도구들을 사용하면 훨씬 간단한 전이가 가능하다는 점을 알아두자.

이제, $G$의 treewidth를 $w$라고 하면 $n = |V(T)|$에 대해 위 풀이가 $O(f(w) \cdot n)$에 동작한다는 사실을 알 수 있다. 또한, $|V(T)|$가 $|V(G)|$에 대해서도 선형 스케일인 optimal tree decomposition이 존재한다는 좋은 사실이 알려져 있다. 즉 $w$를 상수로 취급하면 우리는 tree DP를 이용해 MIS를 선형 시간에 구할 수 있다. 다르게 말하면 treewidth가 작은 그래프에 대해 MIS를 빠르게 구할 수 있다고도 볼 수 있겠다.

그러나 아직 마음이 불편한 부분이 있다. DP의 핵심인 전이를 굉장히 얼렁뚱땅 넘어갔다는 사실이다. 그 이유는 tree decomposition을 nice하게 바꾸면 전이가 훨씬 깔끔해지기 때문으로, **nice tree decomposition**은 각 node $a$가 아래 네 가지 경우 중 하나인 rooted tree decomposition을 의미한다.

1. Leaf node: $a$가 child를 가지지 않으며 bag이 $\emptyset$이다.
2. Introduce node: $a$가 유일한 child $a'$를 가지며, $\chi(a) = \chi(a') \cup \{u\}$이다.
3. Forget node: $a$가 유일한 child $a'$를 가지며, $\chi(a') = \chi(a) \cup \{u\}$이다.
4. Join node: $a$가 정확히 두 개의 child $a', a''$를 가지며, $\chi(a) = \chi(a') = \chi(a'')$이다.

위에서 머리가 아팠던 이유는 child들의 정보를 합쳐 parent로 전이시킬 때 굉장히 다양한 케이스가 나올 수 있고, child가 여러 개가 되면 특히 그런 부분에서 큰 혼돈이 생기기 때문이다. Nice tree decomposition은 이런 문제를 발생시키지 않고 오직 네 가지 간단한 케이스를 처리하면 충분한 문제 상황을 만든다.

이제 네 케이스에 대해 전이 규칙을 만드는 건 훨씬 쉽다. 자세한 서술을 원한다면 [https://github.com/ssimplexity/CS492_spring2026/blob/main/Lecture_Note_CS492.pdf](https://github.com/ssimplexity/CS492_spring2026/blob/main/Lecture_Note_CS492.pdf)의 Chapter 6를 참고하도록 하자.

한 술 더 뜨자면, MSO로 표현할 수 있는 판정 문제는 위와 비슷하게 tree decomposition 위에서의 선형 DP로 해결할 수 있음이 증명되어 있다. 이를 Courcelle's Theorem이라고 하며 자세한 것은 [필자가 2025년 봄학기에 수강한 과목의 중간고사 범위 lecture notes](https://github.com/ssimplexity/CS492_spring2025)를 정독하면 이해할 수 있다. MSO란 대충 (변수, 변수의 집합, 기본적인 논리 기호, 추가로 정의된 관계들)을 조합해 만들 수 있는 논리식을 의미한다. 그래프에서 MSO라고 하면 각 정점이 변수가 되고 추가로 정의된 관계는 adjacent($\mathsf{adj}$)인 상황을 생각하면 된다. 예를 들어 집합 $I$가 independent set임을 뜻하는 MSO는 $\lnot (\exists u \exists v ((u \in I) \land (v \in I) \land \mathsf{adj}(u, v)))$로 쓸 수 있다. 역시 자세한 것은 위 lecture notes를 읽도록 하자.

이쯤에서 한 가지 의문이 들 수 있다. 지금 설명한 알고리즘은 모두 $G$의 optimal nice tree decomposition을 알고 있다고 가정하는데, $G$만 주어진 상황에서 이를 빠르게 찾을 수 있을까? 물론 가능하다. 정확히는 위와 비슷하게 $w$를 상수로 보면 $n = |V(G)|$에 대해서는 선형인 알고리즘이 존재한다. $G$의 treewidth가 $w$ 이하일 때, $w$ 이하의 width를 가지는 tree decomposition을 찾는 것도 [가능하나](https://arxiv.org/pdf/1912.09144) $O(f(w) \cdot n)$의 $f$ 부분이 괴랄하게 큰 것으로 알고 있고, 대신 $5w+4$나 $2w+1$ 이하의 width를 가지는 tree decomposition을 $2^{O(w)} |V(G)|$ 시간에 찾는 알고리즘도 [알려져](https://arxiv.org/pdf/1304.6321) [있다](https://arxiv.org/pdf/2104.07463). 또한, tree decomposition을 width를 증가시키지 않으며 nice tree decomposition으로 바꾸는 것 역시 가능하고, 그렇게 만든 nice tree decomposition의 node 수는 $O(w|V(T)|)$라는 사실 역시 알려져 있다.

물론 tree decomposition이 절대 유사 tree DP 발사대는 아니다. 아예 다른 느낌의 예시로는 grid minor theorem이 있는데, 그래프가 작은 treewidth를 가지지 않는다면 큰 grid minor를 가진다는 정리이다. Grid는 대충 $n \times n$ 격자 형태의 그래프를 의미하며, 이 theorem을 이용하면 ```G가 작은 treewidth를 가진다면 ~~, G에 큰 grid가 있다면 ~~``` 같은 식의 case work가 가능하다. 예를 들어 어떤 planar graph도 충분히 큰 grid 내부에 minor로 넣을 수 있다는 간단한 사실로부터, planar graph $H$를 minor로 가지지 않는 그래프 $G$는 treewidth가 bounded라는 사실을 알 수 있다.

Tree decomposition에 대한 소개는 이쯤에서 마친다. 위에서 언급된 '알려진 결과'들에 대해 궁금하다면 아래 lecture notes와 그 안에서 언급된 references를 참고하길 바란다.

- https://github.com/ssimplexity/CS492_spring2025
- https://github.com/ssimplexity/CS492_spring2026