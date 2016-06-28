using UnityEngine;
using UnityEngine.EventSystems;

public class BaseBullet : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] protected Rigidbody2D rbBullet;
    //Speed of the bullet
    [SerializeField] protected float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] protected int damage;
    //Amount of Knockback the bullet will give
    [SerializeField] protected float knockback;

    protected void Hit(GameObject player)
    {
        //Finds the IHealth component of the hit player 
        ExecuteEvents.Execute<IHealth>(player.gameObject, null, (x, y) => x.ChangeHealth(damage, true));

        //Give the player knockback
        PlayerMovement playerMovement = player.GetComponent<PlayerMovement>();
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        Vector2 currPosition = (rbBullet.position - rbPlayer.position).normalized;
        playerMovement.ApplyKnockback(currPosition * knockback);
    }
}
