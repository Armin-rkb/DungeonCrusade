using UnityEngine;
using System.Collections;

public class HadoukenHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Hadouken hadouken;
    private PlayerFlip flip;


    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Hadouken currHadouken = Instantiate(hadouken, new Vector2(transform.position.x + 1, transform.position.y), hadouken.transform.rotation) as Hadouken;
            currHadouken.GetComponent<Hadouken>().ShootRight();
        }
        else
        {
            Hadouken currHadouken = Instantiate(hadouken, new Vector2(transform.position.x - 1, transform.position.y), Quaternion.Inverse(hadouken.transform.rotation)) as Hadouken;
            currHadouken.GetComponent<Hadouken>().ShootLeft();
        }
    }
}
