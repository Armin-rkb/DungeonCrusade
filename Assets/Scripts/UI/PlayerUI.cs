using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class PlayerUI : MonoBehaviour
{


    [SerializeField]
    private JoinManager _joinManager;

    [SerializeField]
    private List<GameObject> _pStocks;

    /*
     * 0 = P1 Stock
     * 1 = P2 Stock
     * 2 = P3 Stock
     * 4 = P4 Stock
     */

    [SerializeField]
    private List<GameObject> _pHearts;

    /*
     * 0 = P1 Hearts
     * 1 = P2 Hearts
     * 2 = P3 Hearts
     * 4 = P4 Hearts
     */

    [SerializeField]
    private List<GameObject> _pScore;

    /*
     * 0 = P1 Score
     * 1 = P2 Score
     * 2 = P3 Score
     * 4 = P4 Score
     */

    void Awake()
    {
        TwoPlayersActive();
        ThreePlayersActive();
    }

    void TwoPlayersActive()
    {
        if (_joinManager.Players <= 2)
        {
            _pStocks[2].SetActive(false);
            _pStocks[3].SetActive(false);

            _pHearts[2].SetActive(false);
            _pHearts[3].SetActive(false);

            _pScore[2].SetActive(false);
            _pScore[3].SetActive(false);


        }
    }

    void ThreePlayersActive()
    {
        if (_joinManager.Players == 3)
        {
            _pStocks[3].SetActive(false);
            _pHearts[3].SetActive(false);
            _pScore[3].SetActive(false);
        }
    }
}
